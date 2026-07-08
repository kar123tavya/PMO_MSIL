const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const db = new Database(path.join(__dirname, 'pmo_data.db'));

console.log("Checking pending notifications...");
const pending = db.prepare("SELECT * FROM notifications WHERE status='pending' AND type='edit_approval'").all();
console.log(`Found ${pending.length} pending edits.`);

const now = new Date().toISOString();

for (const notif of pending) {
  try {
    const p = JSON.parse(notif.changes_json);
    const existing = db.prepare('SELECT id FROM projects WHERE project = ?').get(p.project);
    let projectId = existing ? existing.id : null;
    
    if (projectId) {
      db.prepare(`UPDATE projects SET
        parent_code=?, project=?, theme=?, division=?, status=?, category=?, fy=?,
        live_target=?, live_actual=?, manhours=?, direct_cost=?, proactive_defect=?, use_cases=?,
        flagship=?, mis=?, critical=?, third_party=?, overall_status=?,
        il_phases=?, phases=?, custom_data=?, assigned_staff_id=?,
        updated_at=?, updated_by=?
        WHERE id=?`
      ).run(
        p.parentCode||null, p.project, p.theme||null, p.division||null,
        p.status||null, p.category||null, p.fy||null,
        p.liveTarget||null, p.liveActual||null,
        p.manhours||null, p.directCost||null, p.proactiveDefect||null, p.useCases||null,
        p.flagship?1:0, p.mis?1:0, p.critical?1:0, p.thirdParty?1:0,
        p.overallStatus||null,
        JSON.stringify(p.il_phases||[]), JSON.stringify(p.phases||{}), JSON.stringify(p.customData||{}),
        p.assignedStaffId||null,
        now, notif.from_name,
        projectId
      );
      
      db.prepare("UPDATE notifications SET status='approved', updated_at=? WHERE id=?").run(now, notif.id);
      console.log(`Approved: ${p.project}`);
    }
  } catch(e) {
    console.error(e);
  }
}
console.log("Done!");
