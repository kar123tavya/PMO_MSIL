const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'pmo_data.db');
const db = new Database(DB_PATH);

// Monkey-patch prepare
const originalPrepare = db.prepare.bind(db);
db.prepare = function(sql) {
  const stmt = originalPrepare(sql);
  const originalRun = stmt.run.bind(stmt);
  const originalGet = stmt.get.bind(stmt);
  const originalAll = stmt.all.bind(stmt);
  
  stmt.run = function(...args) { return originalRun(args.length === 1 && Array.isArray(args[0]) ? args[0] : args); };
  stmt.get = function(...args) { return originalGet(args.length === 1 && Array.isArray(args[0]) ? args[0] : args); };
  stmt.all = function(...args) { return originalAll(args.length === 1 && Array.isArray(args[0]) ? args[0] : args); };
  return stmt;
};

const columns = [
  { name: 'bu_email', type: 'TEXT' },
  { name: 'il4_learnings', type: 'TEXT' },
  { name: 'effort_scores', type: 'TEXT DEFAULT "{}"' }
];

let added = 0;
for (const col of columns) {
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN ${col.name} ${col.type};`);
    console.log(`Added column: ${col.name}`);
    added++;
  } catch (e) {
    console.log(`Column ${col.name} likely exists (Error: ${e.message})`);
  }
}

console.log(`Migration completed. Added ${added} columns.`);
