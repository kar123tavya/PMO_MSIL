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

// 1. Add manager_email column to users
try {
  db.exec("ALTER TABLE users ADD COLUMN manager_email TEXT;");
  console.log("Added manager_email column.");
} catch (e) {
  console.log("manager_email column already exists (or error): " + e.message);
}

// 2. Change default role to viewer
try {
  // SQLite doesn't allow easy ALTER COLUMN DEFAULT, so we just let it be, but future inserts will provide 'viewer' or we can recreate the table.
  // We'll leave the table definition as is, just update the data.
} catch (e) {}

// 3. Translate existing roles
const users = db.prepare('SELECT id, email, role FROM users').all();
let count = 0;
users.forEach(u => {
  let newRole = u.role;
  switch (u.role) {
    case 'department_head': newRole = 'dpm'; break;
    case 'division_head':   newRole = 'sic'; break;
    case 'section_head':    newRole = 'tl'; break;
    case 'senior_manager':  newRole = 'admin'; break;
    case 'deputy_manager':  newRole = 'pic'; break;
    // Keep 'admin', 'pic', 'viewer'
  }
  
  // If it's an unrecognized role, make it viewer, except for valid ones
  if (!['viewer', 'pic', 'tl', 'sic', 'dpm', 'admin'].includes(newRole)) {
    newRole = 'viewer';
  }
  
  if (newRole !== u.role) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, u.id);
    console.log(`Updated ${u.email} from ${u.role} to ${newRole}`);
    count++;
  }
});

console.log(`Migration complete. Updated ${count} users.`);
