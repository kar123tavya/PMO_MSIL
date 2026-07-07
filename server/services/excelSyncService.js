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
  // WARNING: We have disabled fs.watch() because if the user leaves the Excel file open,
  // changes in the web app fail to write (EBUSY). Then when Excel finally saves, it 
  // overwrites the database with stale data from the morning. 
  // All Excel imports must now be done manually via the Web UI Import button.
}

module.exports = { initExcelSync, triggerExcelRewrite };
