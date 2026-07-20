const { Database } = require('node-sqlite3-wasm');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const DB_PATH = path.join(__dirname, 'pmo_data.db');
const db = new Database(DB_PATH);

// Monkey-patch prepare
const originalPrepare = db.prepare.bind(db);
db.prepare = function(sql) {
  const stmt = originalPrepare(sql);
  const originalRun = stmt.run.bind(stmt);
  stmt.run = function(...args) { return originalRun(args.length === 1 && Array.isArray(args[0]) ? args[0] : args); };
  return stmt;
};

const today = new Date();
// Generate a 5-day old date, 30-day old date, and 80-day old date
const dates = [
  new Date(today.getTime() - (5 * 24 * 60 * 60 * 1000)),
  new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000)),
  new Date(today.getTime() - (80 * 24 * 60 * 60 * 1000)),
];

const fakePics = [
  { name: 'John Doe', email: 'john@maruti.co.in' },
  { name: 'Jane Smith', email: 'jane@maruti.co.in' },
  { name: 'Ravi Kumar', email: 'ravi@maruti.co.in' },
];

console.log("Injecting dummy users and projects...");

fakePics.forEach(pic => {
  // Try to insert fake users so their names appear correctly in the Matrix
  try {
    db.prepare(`INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at) 
                VALUES (?, ?, ?, 'hash', 'pic', 'approved', ?, ?)`
    ).run(uuidv4(), pic.name, pic.email, today.toISOString(), today.toISOString());
  } catch (e) {
    // ignore if exists
  }
});

for (let i = 0; i < 9; i++) {
  const pic = fakePics[i % 3].email;
  // Mix up the dates so each PIC gets a different combo
  const date = dates[(i + Math.floor(i / 3)) % 3].toISOString();
  
  db.prepare(`
    INSERT INTO projects (
      id, project, assigned_to, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    `Sample Heatmap Project ${i + 1}`,
    pic,
    'IL2',
    date,
    date
  );
}

console.log("Successfully injected 9 dummy projects with varied staleness (5 days, 30 days, 80 days).");
console.log("Refresh the PIC Tracker page in your browser to see the colorful Heatmap!");
