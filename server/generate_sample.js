const xlsx = require('xlsx');
const fs = require('fs');

const MASTER_HEADERS = [
  'RowNum',
  'Project Type',
  'Parent code',
  'Child Code',
  'Linked Parent code',
  'Project family code',
  'MIS',
  'FSHIP',
  'Project',
  'AI-DX',
  'Status',
  'Category',
  'Division',
  'Live (Target)',
  'FY',
  'Live (Actual)',
  'EOL Date(Actual)',
  'Savings Manhours per Year',
  'Manhours per Month',
  'Investment FY 21~22',
  'Investment FY 22~23',
  'Investment FY 23~24',
  'Investment FY 24~25',
  'Investment FY 25~26',
  'Capital Investment FY 25~26',
  'Investment FY 26~27',
  'Running Cost - FY 26~27 (Investment)',
  'Direct Cost Saving(MRs)',
  'Proactive Defect Detection',
  'Use Cases'
];

const projects = [];

for (let i = 1; i <= 200; i++) {
  // some random data
  const isParent = i % 5 !== 0;
  
  projects.push([
    i + 3, // RowNum starting at 4 like the image
    isParent ? 'Parent' : 'Child', // Project Type
    `2223QAQD-${String(i).padStart(3, '0')}`, // Parent code
    isParent ? '' : `C-${i}`, // Child Code
    '', // Linked Parent code
    `2223QAQD-${String(i).padStart(3, '0')}`, // Project family code
    i % 3 === 0 ? 'Y' : '', // MIS
    i % 15 === 0 ? 'Y' : '', // FSHIP
    `Sample Project ${i} - ${isParent ? 'Main' : 'Sub'}`, // Project
    'DX', // AI-DX
    i % 2 === 0 ? 'Live' : (i % 3 === 0 ? 'Ongoing' : 'Dropped'), // Status
    i % 4 === 0 ? 'Bots' : (i % 4 === 1 ? 'Dashboard' : (i % 4 === 2 ? 'GenAI' : 'PowerApps & Portal')), // Category
    'MQ', // Division
    `Feb-22`, // Live (Target)
    '22-23', // FY
    `Feb-22`, // Live (Actual)
    '', // EOL Date
    i % 5 !== 0 ? (Math.random() * 100).toFixed(3) : '', // Savings Manhours
    i % 5 !== 0 ? (Math.random() * 10).toFixed(2) : '', // Manhours per Month
    '', '', '', '', '', '', '', '', // Investments empty
    i % 7 === 0 ? (Math.random() * 50).toFixed(2) : '', // Direct Cost Saving
    i % 8 === 0 ? Math.floor(Math.random() * 20) : '', // Proactive
    i % 9 === 0 ? Math.floor(Math.random() * 5) : '' // Use Cases
  ]);
}

const ws = xlsx.utils.aoa_to_sheet([MASTER_HEADERS, ...projects]);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Data");
xlsx.writeFile(wb, "Sample_Data_200.xlsx");
console.log("Sample_Data_200.xlsx created successfully");
