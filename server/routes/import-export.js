// ═══════════════════════════════════════════════════════
//  routes/import-export.js
//  GET  /api/projects/export  — download master .xlsx
//  POST /api/projects/import  — upload master .xlsx → DB
// ═══════════════════════════════════════════════════════
'use strict';

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const XLSX    = require('xlsx');
const { db, uuidv4 } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

let _broadcast = () => {};
function setBroadcast(fn) { _broadcast = fn; }

// ── File upload — memory, 10 MB cap ──────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);
    cb(null, ok);
    if (!ok) cb(new Error('Only .xlsx or .xls files allowed'));
  },
});

// ── 30-column master header list (export order) ──────
const MASTER_HEADERS = [
  // ─── Dashboard ───────────────────────────────────
  'Project Code',        // parentCode
  'Project Name',        // project        ← REQUIRED
  'Theme',               // theme
  'Division',            // division
  'IL Status',           // status
  'Category',            // category
  'Financial Year',      // fy
  'Live Target Date',    // liveTarget      (YYYY-MM-DD)
  'Live Actual Date',    // liveActual      (YYYY-MM-DD)
  'Man-Hours / Month',   // manhours
  'Direct Cost (INR)',   // directCost
  'Proactive Defects',   // proactiveDefect
  'Use Cases',           // useCases
  // ─── Flagship ───────────────────────────────────
  'Flagship (Y/N)',      // flagship
  'Critical (Y/N)',      // critical
  'MIS (Y/N)',           // mis
  'Third Party (Y/N)',   // thirdParty
  'Remarks',             // overallStatus
  'Assigned To Staff ID',
  'Overall Progress',
  'IL1 Target Start', 'IL1 Target End', 'IL1 Actual Start', 'IL1 Actual End',
  'IL2 Target Start', 'IL2 Target End', 'IL2 Actual Start', 'IL2 Actual End',
  'IL3 Target Start', 'IL3 Target End', 'IL3 Actual Start', 'IL3 Actual End',
  'IL4 Target Start', 'IL4 Target End', 'IL4 Actual Start', 'IL4 Actual End',
  'IL5 Target Start', 'IL5 Target End', 'IL5 Actual Start', 'IL5 Actual End',
  // ─── Legacy Hidden Columns ───────────────────────
  'Project Type',
  'Parent code',
  'Child C',
  'Linked Parent code',
  'Project family code'
];

// ── Flexible inbound column map ───────────────────────
const COLUMN_MAP = {
  // dashboard
  'project code':           'parentCode',
  'parent code':            'parentCode',
  'project name':           'project',
  'project':                'project',
  'theme':                  'theme',
  'division':               'division',
  'il status':              'status',
  'status':                 'status',
  'category':               'category',
  'financial year':         'fy',
  'live target date':       'liveTarget',
  'target date':            'liveTarget',
  'live target':            'liveTarget',
  'live actual date':       'liveActual',
  'actual date':            'liveActual',
  'live actual':            'liveActual',
  'man-hours / month':      'manhours',
  'man-hours':              'manhours',
  'direct cost (inr)':      'directCost',
  'direct cost':            'directCost',
  'cost':                   'directCost',
  'proactive defects':      'proactiveDefect',
  'defects':                'proactiveDefect',
  'use cases':              'useCases',
  // flagship & flags
  'flagship (y/n)':         'flagship',
  'flagship':               'flagship',
  'critical (y/n)':         'critical',
  'critical':               'critical',
  'mis (y/n)':              'mis',
  'mis':                    'mis',
  'third party (y/n)':      'thirdParty',
  'third party':            'thirdParty',
  'thirdparty':             'thirdParty',
  'remarks':                'overallStatus',
  'overall status':         'overallStatus',
  'remark':                 'overallStatus',
  'overall progress':       'overallStatus',
  // Phase Dates
  'il1 target start':       'IL1 Target Start',
  'il1 target end':         'IL1 Target End',
  'il1 actual start':       'IL1 Actual Start',
  'il1 actual end':         'IL1 Actual End',
  'il2 target start':       'IL2 Target Start',
  'il2 target end':         'IL2 Target End',
  'il2 actual start':       'IL2 Actual Start',
  'il2 actual end':         'IL2 Actual End',
  'il3 target start':       'IL3 Target Start',
  'il3 target end':         'IL3 Target End',
  'il3 actual start':       'IL3 Actual Start',
  'il3 actual end':         'IL3 Actual End',
  'il4 target start':       'IL4 Target Start',
  'il4 target end':         'IL4 Target End',
  'il4 actual start':       'IL4 Actual Start',
  'il4 actual end':         'IL4 Actual End',
  'il5 target start':       'IL5 Target Start',
  'il5 target end':         'IL5 Target End',
  'il5 actual start':       'IL5 Actual Start',
  'il5 actual end':         'IL5 Actual End',
  'assigned to staff id':   'assignedStaffId',
  'staff id':               'assignedStaffId',
  'assigned to':            'assignedStaffId',
  'assigned':               'assignedStaffId',
};

const VALID_STATUSES = ['IL1','IL2','IL3','IL4','IL5','Live','On Hold','Cancelled'];

// ── Helpers ───────────────────────────────────────────
function toDateStr(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial date number
    try {
      const d = XLSX.SSF.parse_date_code(val);
      if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
    } catch (_) {}
  }
  const s = String(val).trim();
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function toBool(val) {
  if (val === true || val === 1) return 1;
  const s = String(val || '').trim().toLowerCase();
  return ['y', 'yes', 'true', '1', '✓', 'x'].includes(s) ? 1 : 0;
}

function toNum(val) {
  const n = parseFloat(String(val || '').replace(/[₹,]/g, ''));
  return isNaN(n) ? null : n;
}

function rowToProject(r) {
  const phases = JSON.parse(r.il_phases || '[]');
  const gp = id => phases.find(p => p.id === id) || {};
  return {
    _key: r.id, parentCode: r.parent_code, project: r.project,
    theme: r.theme, division: r.division, status: r.status,
    category: r.category, fy: r.fy,
    liveTarget: r.live_target, liveActual: r.live_actual,
    manhours: r.manhours, directCost: r.direct_cost,
    proactiveDefect: r.proactive_defect, useCases: r.use_cases,
    flagship: r.flagship === 1, mis: r.mis === 1,
    critical: r.critical === 1, thirdParty: r.third_party === 1,
    overallStatus: r.overall_status, il_phases: phases,
    phases: JSON.parse(r.phases || '{}'),
    customData: JSON.parse(r.custom_data || '{}'),
    assignedStaffId: r.assigned_staff_id,
    createdAt: r.created_at, updatedAt: r.updated_at,
    createdAt: r.created_at, updatedAt: r.updated_at,
    // Gantt helpers
    il1_ts: gp('il1').targetStart, il1_te: gp('il1').targetEnd, il1_as: gp('il1').actualStart, il1_ae: gp('il1').actualEnd,
    il2_ts: gp('il2').targetStart, il2_te: gp('il2').targetEnd, il2_as: gp('il2').actualStart, il2_ae: gp('il2').actualEnd,
    il3_ts: gp('il3').targetStart, il3_te: gp('il3').targetEnd, il3_as: gp('il3').actualStart, il3_ae: gp('il3').actualEnd,
    il4_ts: gp('il4').targetStart, il4_te: gp('il4').targetEnd, il4_as: gp('il4').actualStart, il4_ae: gp('il4').actualEnd,
    il5_ts: gp('il5').targetStart, il5_te: gp('il5').targetEnd, il5_as: gp('il5').actualStart, il5_ae: gp('il5').actualEnd,
  };
}

function buildILPhases(row) {
  const ILS = [
    { id:'il1', label:'IL1 – Ideation', subtasks:['Business problem identification','BRD Preparation & refinement','Value Creation Framework (Cost benefit and ROI analysis)','Project feasibility assessment (Technology Selection)'] },
    { id:'il2', label:'IL2 – Approval', subtasks:['Demand Approval and allocation to CoE','Project requirement discussion with D&I along with Business user','Technical feasibility assessment by DE','Project Scope finalization with BRD sign-off','Vendor Details Shared by DE for RFQ','IPR / RFQ Ring Approval','RFQ Float to vendor and Scope discussion','Technical Evaluation of Vendor Proposals','TEPO Ring (In case of Capital)','Commercial Negotiation by DE','Payment Ring Approval','Vendor Onboarding','Detailed requirement understanding through focused workshops','Wireframe & Figma preparation'] },
    { id:'il3', label:'IL3 – Design & Development', subtasks:['Project detailed scope along with benefits','Design Approval','RFQ & Ring Approval process as in IL2 (Major Projects)','Vendor Onboarding','Solution Development','Management Reviews as per Governance Mechanism'] },
    { id:'il4', label:'IL4 – UAT', subtasks:['User Acceptance Testing (UAT)','UAT feedbacks incorporation','UAT sign-off by User','User Manual & Training Sessions for all Users'] },
    { id:'il5', label:'IL5 – Live', subtasks:['Live Deployment & Hypercare Support'] },
  ];
  return ILS.map(il => ({
    id: il.id, label: il.label,
    targetStart: toDateStr(row[`${il.id.toUpperCase()} Target Start`]),
    targetEnd:   toDateStr(row[`${il.id.toUpperCase()} Target End`]),
    actualStart: toDateStr(row[`${il.id.toUpperCase()} Actual Start`]),
    actualEnd:   toDateStr(row[`${il.id.toUpperCase()} Actual End`]),
    subtasks:  il.subtasks.map(lbl => ({ label: lbl, done: false, startDate: '', endDate: '' })),
  }));
}

const crypto = require('crypto');

// ── Core Export Function ──────────────────────────────
function generateExcelBuffer(db) {
  const rows     = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  const projects = rows.map(rowToProject);

  const customColsStr = db.prepare("SELECT value FROM settings WHERE key='custom_columns'").get()?.value || '[]';
  const customCols = JSON.parse(customColsStr).filter(c => c.status === 'approved');
  
  const DYNAMIC_HEADERS = [...MASTER_HEADERS, ...customCols.map(c => c.label)];

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Master Data (all 30 fields) ──────────
    const dataRows = projects.map(p => {
      const rowArray = [
      p.parentCode  || '',
      p.project     || '',
      p.theme       || '',
      p.division    || '',
      p.status      || '',
      p.category    || '',
      p.fy          || '',
      p.liveTarget  || '',
      p.liveActual  || '',
      p.manhours    != null ? p.manhours    : '',
      p.directCost  != null ? p.directCost  : '',
      p.proactiveDefect != null ? p.proactiveDefect : '',
      p.useCases    != null ? p.useCases    : '',
      p.flagship   ? 'Y' : 'N',
      p.critical   ? 'Y' : 'N',
      p.mis        ? 'Y' : 'N',
      p.thirdParty ? 'Y' : 'N',
      p.overallStatus || '',
      p.il1_ts || '', p.il1_te || '', p.il1_as || '', p.il1_ae || '',
      p.il2_ts || '', p.il2_te || '', p.il2_as || '', p.il2_ae || '',
      p.il3_ts || '', p.il3_te || '', p.il3_as || '', p.il3_ae || '',
      p.il4_ts || '', p.il4_te || '', p.il4_as || '', p.il4_ae || '',
      p.il5_ts || '', p.il5_te || '', p.il5_as || '', p.il5_ae || '',
      p.assignedStaffId || '',
      p.overallStatus || '',
      'Parent',         // Project Type
      p.parentCode || '', // Parent code
      '',               // Child C
      '',               // Linked Parent code
      p.parentCode || '', // Project family code
      ...customCols.map(c => p.customData?.[c.id] || '')
    ];
    
    const hashStr = JSON.stringify(rowArray.map(String).map(s => s.trim()));
    const hash = crypto.createHash('md5').update(hashStr).digest('hex');
    try {
      db.prepare('UPDATE projects SET last_exported_hash = ? WHERE id = ?').run(hash, p._key);
    } catch(e) {
      // Ignore if migration hasn't run yet
    }
    return rowArray;
  });

    const ws1 = XLSX.utils.aoa_to_sheet([DYNAMIC_HEADERS, ...dataRows]);
    // Set column widths and hide legacy columns
    ws1['!cols'] = DYNAMIC_HEADERS.map(h => {
      if (['Project Type', 'Parent code', 'Child C', 'Linked Parent code', 'Project family code'].includes(h)) {
        return { hidden: true };
      }
      return { wch: Math.max(String(h).length + 2, 16) };
    });
    // Freeze top row
    ws1['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws1, 'Master Data');

    // ── Sheet 2: Column Reference ─────────────────────
    const refRows = [
      ['Column Header',          'Field',          'View',                     'Example / Notes'],
      ['Project Code',           'parentCode',     'Dashboard, Flagship',       '#A001'],
      ['Project Name',           'project',        'All Views',                 'Vendor Portal — REQUIRED'],
      ['Theme',                  'theme',          'All Views',                 'Digital Transformation'],
      ['Division',               'division',       'Dashboard',                 'Finance'],
      ['IL Status',              'status',         'All Views',                 'IL1 / IL2 / IL3 / IL4 / IL5 / Live / On Hold / Cancelled'],
      ['Category',               'category',       'Dashboard',                 'Process Automation'],
      ['Financial Year',         'fy',             'Dashboard',                 '2025-26'],
      ['Live Target Date',       'liveTarget',     'Dashboard, Gantt',          '2025-12-31  (YYYY-MM-DD)'],
      ['Live Actual Date',       'liveActual',     'Dashboard',                 '2026-01-15  (YYYY-MM-DD)'],
      ['Man-Hours / Month',      'manhours',       'Dashboard (KPI)',            '120'],
      ['Direct Cost (INR)',      'directCost',     'Dashboard (KPI)',            '500000'],
      ['Proactive Defects',      'proactiveDefect','Dashboard (KPI)',            '45'],
      ['Use Cases',              'useCases',       'Dashboard (KPI)',            '12'],
      ['Flagship (Y/N)',         'flagship',       'Flagship page',             'Y or N'],
      ['Critical (Y/N)',         'critical',       'Dashboard',                 'Y or N'],
      ['MIS (Y/N)',              'mis',            'Dashboard',                 'Y or N'],
      ['Third Party (Y/N)',      'thirdParty',     'Flagship page',             'Y or N'],
      ['Remarks',                'overallStatus',  'Flagship, Dashboard',        'Design phase in progress...'],
      ['IL1 Target Start',       'IL1 Target Start', 'Gantt Chart',              '2024-04-01'],
      ['IL1 Target End',         'IL1 Target End',   'Gantt Chart',              '2024-05-15'],
      ['IL1 Actual Start',       'IL1 Actual Start', 'Gantt Chart',              '2024-04-05'],
      ['IL1 Actual End',         'IL1 Actual End',   'Gantt Chart',              '2024-05-20'],
      ['IL2 Target Start',       'IL2 Target Start', 'Gantt Chart',              '2024-05-01'],
      ['IL2 Target End',         'IL2 Target End',   'Gantt Chart',              '2024-07-30'],
      ['IL2 Actual Start',       'IL2 Actual Start', 'Gantt Chart',              '2024-05-01'],
      ['IL2 Actual End',         'IL2 Actual End',   'Gantt Chart',              '2024-07-30'],
      ['IL3 Target Start',       'IL3 Target Start', 'Gantt Chart',              '2024-08-01'],
      ['IL3 Target End',         'IL3 Target End',   'Gantt Chart',              '2024-11-30'],
      ['IL3 Actual Start',       'IL3 Actual Start', 'Gantt Chart',              '2024-08-01'],
      ['IL3 Actual End',         'IL3 Actual End',   'Gantt Chart',              '2024-11-30'],
      ['IL4 Target Start',       'IL4 Target Start', 'Gantt Chart',              '2024-12-01'],
      ['IL4 Target End',         'IL4 Target End',   'Gantt Chart',              '2025-01-31'],
      ['IL4 Actual Start',       'IL4 Actual Start', 'Gantt Chart',              '2024-12-01'],
      ['IL4 Actual End',         'IL4 Actual End',   'Gantt Chart',              '2025-01-31'],
      ['IL5 Target Start',       'IL5 Target Start', 'Gantt Chart',              '2025-02-01'],
      ['IL5 Target End',         'IL5 Target End',   'Gantt Chart',              '2025-03-15'],
      ['IL5 Actual Start',       'IL5 Actual Start', 'Gantt Chart',              '2025-02-01'],
      ['IL5 Actual End',         'IL5 Actual End',   'Gantt Chart',              '2025-03-15'],
      ['Assigned To Staff ID',   'assignedStaffId','All Views',                 'EMP123'],
      ['Overall Progress',       'overallStatus',  'All Views',                 '90% complete, UAT started'],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(refRows);
    ws2['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 24 }, { wch: 46 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Column Reference');

    // ── Sheet 3: Blank Import Template ───────────────
    const ws3 = XLSX.utils.aoa_to_sheet([DYNAMIC_HEADERS]);
    ws3['!cols'] = DYNAMIC_HEADERS.map(h => ({ wch: Math.max(String(h).length + 2, 16) }));
    XLSX.utils.book_append_sheet(wb, ws3, 'Import Template');

    // ── Write to binary string, convert to Buffer ─────
    // Using 'binary' → Buffer.from(,'binary') is the most reliable cross-platform method
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    const buf   = Buffer.from(wbout, 'binary');

    const filename = `PMO_Master_${new Date().toISOString().slice(0, 10)}.xlsx`;
    return { buffer: buf, filename };
}

// ── GET /api/projects/export ──────────────────────────
router.get('/export', authMiddleware, (req, res) => {
  try {
    const { buffer, filename } = generateExcelBuffer(db);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (err) {
    console.error('[Export] Error:', err);
    res.status(500).json({ error: 'Export failed: ' + err.message });
  }
});

// ── Core Import Function ──────────────────────────────
function processExcelBuffer(db, buffer, userEmail, userName, userRole, userUid) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rawRows.length < 2) throw new Error('File has no data rows (need at least a header + 1 row).');

  const customColsStr = db.prepare("SELECT value FROM settings WHERE key='custom_columns'").get()?.value || '[]';
  const customCols = JSON.parse(customColsStr).filter(c => c.status === 'approved');

  const currentColumnMap = { ...COLUMN_MAP };
  customCols.forEach(c => {
    currentColumnMap[c.label.toLowerCase()] = `custom_${c.id}`;
  });

  const headerRow = rawRows[0].map(h => String(h || '').trim().toLowerCase());
  const fieldMap  = headerRow.map(h => currentColumnMap[h] || null);

  let imported = 0, skipped = 0;
  const errors = [];
  const now = new Date().toISOString();

  // Begin transaction if possible, but SQLite here supports standard run.
  for (let i = 1; i < rawRows.length; i++) {
    const raw = rawRows[i];
    if (raw.every(c => c === '' || c == null)) continue;
    
    const row = {};
    const customData = {};
    fieldMap.forEach((field, idx) => {
      if (field) {
        if (field.startsWith('custom_')) {
          customData[field.replace('custom_', '')] = raw[idx];
        } else {
          row[field] = raw[idx];
        }
      }
    });

    if (!row.project || !String(row.project).trim()) {
      skipped++;
      continue;
    }

    try {
      const hashStr = JSON.stringify(raw.map(String).map(s => s.trim()));
      const rowHash = crypto.createHash('md5').update(hashStr).digest('hex');

      // Find existing project by name if parentCode matches, else by name only
      // Usually import just matches by Project Name if no ID, but we do INSERT OR REPLACE
      // We need a stable ID if it exists.
      let id = uuidv4();
      let isExisting = false;
      
      let phases = buildILPhases(row);
      
      const existing = db.prepare('SELECT id, last_exported_hash, il_phases FROM projects WHERE project = ?').get(String(row.project).trim());
      if (existing) {
        // If the hash is exactly what we last exported, the human did not edit this row in Excel!
        // We skip it to protect any newer edits made via the Web UI.
        if (existing.last_exported_hash === rowHash) {
          skipped++;
          continue;
        }
        id = existing.id;
        isExisting = true;
        
        // PRESERVE granular subtask data and colors which don't exist in Excel!
        try {
          const oldPhases = JSON.parse(existing.il_phases || '[]');
          phases = phases.map(newP => {
             const oldP = oldPhases.find(op => op.id === newP.id);
             if (oldP) {
                 // Only overwrite if the new date string is provided (not empty)
                 // This protects against wiping dates when headers are missing
                 if (newP.targetStart) oldP.targetStart = newP.targetStart;
                 if (newP.targetEnd) oldP.targetEnd = newP.targetEnd;
                 if (newP.actualStart) oldP.actualStart = newP.actualStart;
                 if (newP.actualEnd) oldP.actualEnd = newP.actualEnd;
                 return oldP;
             }
             return newP;
          });
        } catch(e) {}
      } else {
        // --- NEW PROJECT: Auto-generate QAQD Code if missing ---
        if (!row.parentCode || !String(row.parentCode).trim()) {
          let fyCode = '0000';
          if (row.fy) {
            const nums = String(row.fy).match(/\d+/g);
            if (nums && nums.length >= 2) {
              let yr1 = nums[0].slice(-2);
              let yr2 = nums[1].slice(-2);
              fyCode = yr1 + yr2;
            }
          } else {
            const dt = new Date();
            const yr = dt.getFullYear();
            const mo = dt.getMonth() + 1;
            let yr1 = mo >= 4 ? yr : yr - 1;
            let yr2 = yr1 + 1;
            fyCode = String(yr1).slice(-2) + String(yr2).slice(-2);
          }
      
          const likePattern = `${fyCode}QAQD-%`;
          const codeRows = db.prepare('SELECT parent_code FROM projects WHERE parent_code LIKE ?').all(likePattern);
          
          let maxNum = 0;
          codeRows.forEach(r => {
            if (r.parent_code) {
              const parts = r.parent_code.split('-');
              if (parts.length === 2) {
                const num = parseInt(parts[1], 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
              }
            }
          });
          const nextNum = maxNum + 1;
          const nextNumStr = String(nextNum).padStart(3, '0');
          row.parentCode = `${fyCode}QAQD-${nextNumStr}`;
          
          // Force it to be in the database before the next iteration
          // so that sequential imports of new projects don't all get -001
          db.prepare('INSERT INTO projects (id, parent_code, project) VALUES (?, ?, ?)').run(id, row.parentCode, String(row.project).trim());
        }
      }

      const statusVal = String(row.status || '').trim();

      // If we are updating an existing row, we shouldn't overwrite last_exported_hash here
      // so it remains out of sync until a new Export happens, OR we can set it to the new hash.
      // But INSERT OR REPLACE will wipe out last_exported_hash if we don't include it.
      db.prepare(`INSERT OR REPLACE INTO projects (
        id, parent_code, project, theme, division, status, category, fy,
        live_target, live_actual, manhours, direct_cost, proactive_defect, use_cases,
        flagship, mis, critical, third_party, overall_status,
        il_phases, phases, custom_data, assigned_staff_id, last_exported_hash,
        created_at, created_by, updated_at, updated_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(
        id,
        String(row.parentCode  || '').trim() || null,
        String(row.project).trim(),
        String(row.theme       || '').trim() || null,
        String(row.division    || '').trim() || null,
        VALID_STATUSES.includes(statusVal) ? statusVal : null,
        String(row.category    || '').trim() || null,
        String(row.fy          || '').trim() || null,
        toDateStr(row.liveTarget) || null,
        toDateStr(row.liveActual) || null,
        toNum(row.manhours),
        toNum(row.directCost),
        toNum(row.proactiveDefect),
        toNum(row.useCases),
        toBool(row.flagship),
        toBool(row.mis),
        toBool(row.critical),
        toBool(row.thirdParty),
        String(row.overallStatus || '').trim() || null,
        JSON.stringify(phases),
        JSON.stringify({}),
        JSON.stringify(customData),
        String(row.assignedStaffId  || '').trim() || null,
        rowHash,
        now, userEmail, now, userEmail
      );

      db.prepare(`INSERT INTO audit_log (id,project_id,project_name,user_id,user_name,role,action,timestamp)
        VALUES (?,?,?,?,?,?,?,?)`
      ).run(uuidv4(), id, String(row.project).trim(), userUid, userName, userRole, 'imported', now);

      imported++;
    } catch (rowErr) {
      errors.push(`Row ${i + 1} ("${row.project || '?'}"): ${rowErr.message}`);
      skipped++;
    }
  }

  return { imported, skipped, errors };
}

// ── POST /api/projects/import ─────────────────────────
router.post('/import', authMiddleware, upload.single('file'), (req, res) => {
  if (!['senior_manager', 'section_head'].includes(req.user.role))
    return res.status(403).json({ error: 'Only Senior Managers and Section Heads can import.' });

  if (!req.file)
    return res.status(400).json({ error: 'No file uploaded.' });

  try {
    const { imported, skipped, errors } = processExcelBuffer(
      db, 
      req.file.buffer, 
      req.user.email, 
      req.user.name, 
      req.user.role, 
      req.user.uid
    );

    // Broadcast updated list
    const allRows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    _broadcast('projects_changed', allRows.map(rowToProject));

    res.json({ imported, skipped, errors: errors.slice(0, 20) });

  } catch (err) {
    console.error('[Import] Error:', err);
    res.status(500).json({ error: 'Failed to parse Excel: ' + err.message });
  }
});

module.exports = { router, setBroadcast, generateExcelBuffer, processExcelBuffer, rowToProject };
