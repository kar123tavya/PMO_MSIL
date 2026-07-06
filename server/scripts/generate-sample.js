// ═══════════════════════════════════════════════════════
//  scripts/generate-sample.js
//  Run: node scripts/generate-sample.js
//  Creates: sample/PMO_Sample_Import.xlsx
// ═══════════════════════════════════════════════════════
'use strict';

const XLSX = require('xlsx');
const path = require('path');
const fs   = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'sample');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

/* ── 5 realistic sample projects ── */
const HEADERS = [
  'Project Code','Project Name','Theme','Division','IL Status','Category',
  'Financial Year','Live Target Date','Live Actual Date',
  'Man-Hours / Month','Direct Cost (INR)','Proactive Defects','Use Cases',
  'Flagship (Y/N)','Critical (Y/N)','MIS (Y/N)','Third Party (Y/N)','Remarks',
  'IL1 Phase Start','IL1 Phase End',
  'IL2 Phase Start','IL2 Phase End',
  'IL3 Phase Start','IL3 Phase End',
  'IL4 Phase Start','IL4 Phase End',
  'IL5 Phase Start','IL5 Phase End',
  'Assigned To (Email)','Overall Progress',
];

const ROWS = [
  ['MSL-001','Vendor Portal Digitization','Digital Transformation','Finance','IL3','Process Automation','2025-26','2025-12-31','',160,850000,38,8,'Y','Y','N','N','Design phase in progress. UAT scheduled for Nov.','2025-04-01','2025-05-15','2025-05-01','2025-07-31','2025-08-01','2025-11-30','2025-12-01','2025-12-31','','','dm1@maruti.co.in','65% complete'],
  ['MSL-002','SAP HR Module Integration','Operational Excellence','HR','IL2','Integration','2025-26','2026-03-31','',120,1200000,0,12,'N','N','Y','Y','Vendor evaluation in progress. 3 shortlisted.','2025-03-01','2025-04-30','2025-05-01','','','','','','','','sm2@maruti.co.in','20% complete'],
  ['MSL-003','Customer Complaint Analytics','Customer Experience','Customer Service','IL4','Analytics','2024-25','2025-06-30','2025-07-15',80,340000,55,18,'Y','N','Y','N','UAT completed. Rollout pending. Minor bugs fixed.','2024-10-01','2024-11-30','2024-12-01','2025-01-31','2025-02-01','2025-04-30','2025-05-01','2025-06-30','2025-07-01','2025-07-15','dm2@maruti.co.in','95% — live this week'],
  ['MSL-004','Supply Chain Visibility Dashboard','Data & Analytics','Supply Chain','Live','Reporting','2024-25','2025-03-31','2025-03-28',200,675000,72,24,'Y','Y','Y','N','Successfully live. Hypercare ongoing.','2024-07-01','2024-08-15','2024-08-01','2024-10-31','2024-11-01','2025-01-31','2025-02-01','2025-03-15','2025-03-16','2025-03-28','dm3@maruti.co.in','100% — Live & stable'],
  ['MSL-005','Mobile Approval Workflow App','Digital Transformation','IT','IL1','Innovation','2026-27','2026-09-30','',60,0,0,5,'N','N','N','N','BRD being drafted. Tech stack under review.','2026-04-01','','','','','','','','','','dm4@maruti.co.in','10% — ideation'],
];

/* ── Sheet 1: Import Data ── */
const ws1 = XLSX.utils.aoa_to_sheet([HEADERS, ...ROWS]);
ws1['!cols'] = HEADERS.map(h => ({ wch: Math.max(h.length + 2, 18) }));

/* ── Sheet 2: Instructions ── */
const INSTRUCTIONS = [
  ['PMO Dashboard — Sample Import File', '', ''],
  ['', '', ''],
  ['HOW TO USE THIS FILE', '', ''],
  ['1. Fill your project data in the "Sample Data" sheet following the format shown.', '', ''],
  ['2. Save the file as .xlsx or .xls format.', '', ''],
  ['3. In the PMO Dashboard, click "Import" (⬆ Import button).', '', ''],
  ['4. Upload this file. New projects will be ADDED to the existing list.', '', ''],
  ['5. Projects with the same Project Code will be UPDATED (merged).', '', ''],
  ['', '', ''],
  ['FIELD RULES', '', ''],
  ['Project Name', 'REQUIRED', 'Any text e.g. "Vendor Portal Digitization"'],
  ['IL Status', 'One of:', 'IL1 / IL2 / IL3 / IL4 / IL5 / Live / On Hold / Cancelled'],
  ['Flagship (Y/N)', 'Y or N', 'Whether this is a flagship project'],
  ['Dates', 'YYYY-MM-DD', 'e.g. 2025-12-31'],
  ['Man-Hours / Month', 'Number', 'Monthly man-hours spent e.g. 120'],
  ['Direct Cost (INR)', 'Number', 'Total INR cost e.g. 500000 (no commas or ₹ symbol)'],
  ['Financial Year', 'Format:', '2025-26'],
  ['', '', ''],
  ['IMPORT BEHAVIOUR', '', ''],
  ['• If a Project Code already exists → the project will be UPDATED', '', ''],
  ['• If the Project Code is blank or new → a new project is CREATED', '', ''],
  ['• Blank rows are skipped automatically', '', ''],
  ['• Maximum 500 projects per import file', '', ''],
];

const ws2 = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
ws2['!cols'] = [{ wch: 50 }, { wch: 16 }, { wch: 44 }];

/* ── Sheet 3: Column Reference ── */
const REF = [
  ['Column Header', 'Required?', 'View Used In', 'Example'],
  ['Project Code', 'Optional', 'Dashboard, Flagship', 'MSL-001'],
  ['Project Name', '★ REQUIRED', 'All Views', 'Vendor Portal Digitization'],
  ['Theme', 'Optional', 'All Views', 'Digital Transformation'],
  ['Division', 'Optional', 'Dashboard', 'Finance'],
  ['IL Status', 'Optional', 'All Views', 'IL1 / IL2 / IL3 / IL4 / IL5 / Live / On Hold / Cancelled'],
  ['Category', 'Optional', 'Dashboard', 'Process Automation'],
  ['Financial Year', 'Optional', 'Dashboard', '2025-26'],
  ['Live Target Date', 'Optional', 'Dashboard, Gantt', '2025-12-31'],
  ['Live Actual Date', 'Optional', 'Dashboard', '2026-01-15'],
  ['Man-Hours / Month', 'Optional', 'KPI Cards', '160'],
  ['Direct Cost (INR)', 'Optional', 'KPI Cards', '850000'],
  ['Proactive Defects', 'Optional', 'KPI Cards', '38'],
  ['Use Cases', 'Optional', 'KPI Cards', '8'],
  ['Flagship (Y/N)', 'Optional', 'Flagship Page', 'Y'],
  ['Critical (Y/N)', 'Optional', 'Dashboard', 'Y'],
  ['MIS (Y/N)', 'Optional', 'Dashboard', 'N'],
  ['Third Party (Y/N)', 'Optional', 'Flagship Page', 'N'],
  ['Remarks', 'Optional', 'All Views', 'Design phase in progress'],
  ['IL1 Phase Start', 'Optional', 'Gantt Chart', '2025-04-01'],
  ['IL1 Phase End', 'Optional', 'Gantt Chart', '2025-05-15'],
  ['IL2 Phase Start', 'Optional', 'Gantt Chart', '2025-05-01'],
  ['IL2 Phase End', 'Optional', 'Gantt Chart', '2025-07-31'],
  ['IL3 Phase Start', 'Optional', 'Gantt Chart', '2025-08-01'],
  ['IL3 Phase End', 'Optional', 'Gantt Chart', '2025-11-30'],
  ['IL4 Phase Start', 'Optional', 'Gantt Chart', '2025-12-01'],
  ['IL4 Phase End', 'Optional', 'Gantt Chart', '2025-12-31'],
  ['IL5 Phase Start', 'Optional', 'Gantt Chart', ''],
  ['IL5 Phase End', 'Optional', 'Gantt Chart', ''],
  ['Assigned To (Email)', 'Optional', 'All Views', 'dm@maruti.co.in'],
  ['Overall Progress', 'Optional', 'All Views', '65% complete'],
];

const ws3 = XLSX.utils.aoa_to_sheet(REF);
ws3['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 46 }];

/* ── Build workbook ── */
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws1, 'Sample Data');
XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');
XLSX.utils.book_append_sheet(wb, ws3, 'Column Reference');

const outFile = path.join(OUT_DIR, 'PMO_Sample_Import.xlsx');
XLSX.writeFile(wb, outFile);

console.log('✅ Sample file generated:', outFile);
console.log('   • 5 sample projects in "Sample Data" sheet');
console.log('   • Import instructions in "Instructions" sheet');
console.log('   • Column reference in "Column Reference" sheet');
console.log('');
console.log('👉 Use this file with the ⬆ Import button in the dashboard.');
