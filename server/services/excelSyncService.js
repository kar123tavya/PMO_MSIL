const fs = require('fs');
const path = require('path');
const { generateExcelBuffer, processExcelBuffer, rowToProject } = require('../routes/import-export');

let isWriting = false; // Prevent recursive loops when we write to the file ourselves
let _masterFilePath = path.join(__dirname, '..', '..', 'PMO_Master.xlsx'); // Default path

function triggerExcelRewrite(db) {
  if (!_masterFilePath) return;
  try {
    const { buffer } = generateExcelBuffer(db);
    isWriting = true;
    try {
      fs.writeFileSync(_masterFilePath, buffer);
    } catch (e) {
      if (e.code === 'EBUSY') {
        console.warn('[Excel Sync] EBUSY: Excel file is open. Skipping automatic overwrite. Close Excel to allow updates.');
      } else {
        console.error('[Excel Sync] Error writing Excel file:', e.message);
      }
    }
    // Give OS time to release handle before accepting watch events
    setTimeout(() => { isWriting = false; }, 1000);
  } catch (err) {
    console.error('[Excel Sync] Failed to generate Excel buffer:', err.message);
  }
}

function initExcelSync(db, masterFilePath, broadcastCb) {
  _masterFilePath = masterFilePath;
  console.log('[Excel Sync] Initializing on:', _masterFilePath);

  // 1. Initially create the file if it doesn't exist
  if (!fs.existsSync(_masterFilePath)) {
    console.log('[Excel Sync] Master file not found. Creating initial file...');
    triggerExcelRewrite(db);
  }

  // 2. Watch the file for changes
  let timeout = null;
  fs.watch(_masterFilePath, (eventType, filename) => {
    if (eventType !== 'change' || isWriting) return;

    // Debounce the watch event because some editors emit multiple 'change' events quickly
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      console.log(`[Excel Sync] Detected changes in ${_masterFilePath}. Syncing to DB...`);
      try {
        const buffer = fs.readFileSync(_masterFilePath);
        // Process as 'System' user
        const result = processExcelBuffer(
          db, 
          buffer, 
          'system@localhost', 
          'Background Sync', 
          'admin', 
          'SYSTEM-SYNC'
        );
        console.log(`[Excel Sync] DB Update complete: ${result.imported} imported, ${result.skipped} skipped.`);
        
        // Notify frontend via SSE so they can reload/update
        const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
        if (broadcastCb) broadcastCb('projects_changed', rows.map(rowToProject));
      } catch (e) {
        if (e.code === 'EBUSY') {
          console.warn('[Excel Sync] File is currently locked for writing by Excel. Retrying later...');
        } else {
          console.error('[Excel Sync] Import failed:', e.message);
        }
      }
    }, 500); // 500ms debounce
  });
}

module.exports = { initExcelSync, triggerExcelRewrite };
