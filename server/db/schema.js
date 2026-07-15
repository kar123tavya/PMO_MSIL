// ═══════════════════════════════════════════════════════
//  schema.js — SQLite database initialisation & seeding
// ═══════════════════════════════════════════════════════
const { Database } = require('node-sqlite3-wasm');
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path     = require('path');
const fs       = require('fs');

const DB_PATH = path.join(__dirname, '..', 'pmo_data.db');
const LOCK_PATH = DB_PATH + '.lock';

// Auto-cleanup stale lock directory on startup if it exists
if (fs.existsSync(LOCK_PATH)) {
  try {
    fs.rmSync(LOCK_PATH, { recursive: true, force: true });
    console.log('[PMO DB] Cleared stale database lock.');
  } catch (err) {
    console.error('[PMO DB] Warning: Could not clear stale lock:', err.message);
  }
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

// Monkey-patch prepare to accept variable arguments like better-sqlite3 does
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


function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      email        TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role         TEXT NOT NULL DEFAULT 'viewer',
      manager_email TEXT,
      department   TEXT,
      division     TEXT,
      section      TEXT,
      staff_no     TEXT,
      designation  TEXT,
      status       TEXT NOT NULL DEFAULT 'pending',
      created_at   TEXT NOT NULL,
      updated_at   TEXT
    );
  `);
  
  try { db.prepare("ALTER TABLE notifications ADD COLUMN cleared_by TEXT DEFAULT '[]'").run(); } catch(e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS health_cards (
      id          TEXT PRIMARY KEY,
      division    TEXT NOT NULL,
      month_year  TEXT NOT NULL,
      data_json   TEXT NOT NULL,
      updated_by  TEXT,
      updated_by_name TEXT,
      updated_at  TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_hc_div_month ON health_cards(division, month_year);
  `);

  try { db.exec("ALTER TABLE users ADD COLUMN manager_email TEXT;"); } catch (e) {}

  // Migrate roles
  db.exec(`
    UPDATE users SET role = 'dpm' WHERE role = 'department_head';
    UPDATE users SET role = 'sic' WHERE role = 'division_head';
    UPDATE users SET role = 'tl' WHERE role = 'section_head';
    UPDATE users SET role = 'admin' WHERE role = 'senior_manager';
    UPDATE users SET role = 'pic' WHERE role = 'deputy_manager';
  `);
  
  db.exec(`

    CREATE TABLE IF NOT EXISTS projects (
      id               TEXT PRIMARY KEY,
      parent_code      TEXT,
      project          TEXT NOT NULL,
      theme            TEXT,
      division         TEXT,
      status           TEXT,
      category         TEXT,
      fy               TEXT,
      live_target      TEXT,
      live_actual      TEXT,
      manhours         REAL,
      direct_cost      REAL,
      proactive_defect REAL,
      use_cases        REAL,
      flagship         INTEGER DEFAULT 0,
      mis              INTEGER DEFAULT 0,
      critical         INTEGER DEFAULT 0,
      third_party      INTEGER DEFAULT 0,
      overall_status   TEXT,
      il_phases        TEXT DEFAULT '[]',
      phases           TEXT DEFAULT '{}',
      custom_data      TEXT DEFAULT '{}',
      assigned_to      TEXT,
      assigned_staff_id TEXT,
      bu_email         TEXT,
      il4_learnings    TEXT,
      effort_scores    TEXT DEFAULT '{}',
      created_at       TEXT NOT NULL,
      created_by       TEXT,
      updated_at       TEXT,
      updated_by       TEXT
    );
  `);

  try { db.exec("ALTER TABLE projects ADD COLUMN bu_email TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE projects ADD COLUMN il4_learnings TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE projects ADD COLUMN effort_scores TEXT DEFAULT '{}';"); } catch (e) {}
  try { db.exec("ALTER TABLE notifications ADD COLUMN custom_data TEXT DEFAULT '{}';"); } catch (e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id           TEXT PRIMARY KEY,
      project_id   TEXT,
      project_name TEXT,
      user_id      TEXT,
      user_name    TEXT,
      role         TEXT,
      action       TEXT,
      field_name   TEXT,
      from_val     TEXT,
      to_val       TEXT,
      changes_json TEXT,
      timestamp    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id           TEXT PRIMARY KEY,
      type         TEXT NOT NULL,
      title        TEXT NOT NULL,
      body         TEXT,
      to_users     TEXT DEFAULT '[]',
      cc_users     TEXT DEFAULT '[]',
      from_user    TEXT,
      from_name    TEXT,
      project_id   TEXT,
      project_name TEXT,
      status       TEXT DEFAULT 'pending',
      priority     TEXT DEFAULT 'normal',
      changes_json TEXT,
      read_by      TEXT DEFAULT '[]',
      cleared_by   TEXT DEFAULT '[]',
      custom_data  TEXT DEFAULT '{}',
      created_at   TEXT NOT NULL,
      updated_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS custom_columns (
      id         TEXT PRIMARY KEY,
      label      TEXT NOT NULL,
      type       TEXT NOT NULL DEFAULT 'text',
      views      TEXT NOT NULL DEFAULT '["dashboard","flagship","gantt"]',
      status     TEXT NOT NULL DEFAULT 'pending',
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS global_settings (
      id         TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT
    );
  `);

  /* ── Migrations ── */
  try { db.exec('ALTER TABLE projects ADD COLUMN assigned_staff_id TEXT;'); } catch(e) { /* ignores if exists */ }
  try { db.exec('ALTER TABLE projects ADD COLUMN last_exported_hash TEXT;'); } catch(e) { /* ignores if exists */ }

  /* ── Seed default admin if no users exist ── */
  const userCount = db.prepare('SELECT COUNT(*) AS cnt FROM users').get();
  if (userCount.cnt === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), 'Administrator', 'admin@maruti.co.in', hash, 'admin', 'active', new Date().toISOString());
    console.log('[PMO DB] Seeded admin — email: admin@maruti.co.in  password: admin123');
  }

  /* ── Default settings ── */
  const hasCols = db.prepare("SELECT key FROM settings WHERE key='custom_columns'").get();
  if (!hasCols) {
    db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?,?,?)").run('custom_columns', '[]', new Date().toISOString());
  }

  const hasPhases = db.prepare("SELECT key FROM settings WHERE key='il_phases'").get();
  if (!hasPhases) {
    const phases = JSON.stringify([
      { id:'il1', label:'IL1 – Ideation',              barClass:'bar-il1', pillClass:'il1', bgClass:'il-bg1',
        subtasks:['Business problem identification','BRD Preparation & refinement','Value Creation Framework (Cost benefit and ROI analysis)','Project feasibility assessment (Technology Selection)'] },
      { id:'il2', label:'IL2 – Approval',              barClass:'bar-il2', pillClass:'il2', bgClass:'il-bg2',
        subtasks:['Demand Approval and allocation to CoE','Project requirement discussion with D&I along with Business user','Technical feasibility assessment by DE','Project Scope finalization with BRD sign-off','Vendor Details Shared by DE for RFQ','IPR / RFQ Ring Approval','RFQ Float to vendor and Scope discussion','Technical Evaluation of Vendor Proposals','TEPO Ring (In case of Capital)','Commercial Negotiation by DE','Payment Ring Approval','Vendor Onboarding','Detailed requirement understanding through focused workshops','Wireframe & Figma preparation'] },
      { id:'il3', label:'IL3 – Design & Development',  barClass:'bar-il3', pillClass:'il3', bgClass:'il-bg3',
        subtasks:['Project detailed scope along with benefits','Design Approval','RFQ & Ring Approval process as in IL2 (Major Projects)','Vendor Onboarding','Solution Development','Management Reviews as per Governance Mechanism'] },
      { id:'il4', label:'IL4 – UAT',                   barClass:'bar-il4', pillClass:'il4', bgClass:'il-bg4',
        subtasks:['User Acceptance Testing (UAT)','UAT feedbacks incorporation','UAT sign-off by User','User Manual & Training Sessions for all Users'] },
      { id:'il5', label:'IL5 – Live',                  barClass:'bar-il5', pillClass:'il5', bgClass:'il-bg5',
        subtasks:['Live Deployment & Hypercare Support'] },
    ]);
    db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?,?,?)").run('il_phases', phases, new Date().toISOString());
  }

  // Migrations
  try { db.exec("ALTER TABLE projects ADD COLUMN assigned_staff_id TEXT;"); } catch (e) { /* ignore if exists */ }
}

initSchema();

module.exports = { db, uuidv4 };
