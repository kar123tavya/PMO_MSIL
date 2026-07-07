// ═══════════════════════════════════════════════════════
//  routes/projects.js — Project CRUD
// ═══════════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const { db, uuidv4 } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');
const { triggerExcelRewrite } = require('../services/excelSyncService');

let _broadcast = () => {};
function setBroadcast(fn) { _broadcast = fn; }

function rowToProject(row) {
  return {
    _key:            row.id,
    parentCode:      row.parent_code,
    project:         row.project,
    theme:           row.theme,
    division:        row.division,
    status:          row.status,
    category:        row.category,
    fy:              row.fy,
    liveTarget:      row.live_target,
    liveActual:      row.live_actual,
    manhours:        row.manhours,
    directCost:      row.direct_cost,
    proactiveDefect: row.proactive_defect,
    useCases:        row.use_cases,
    flagship:        row.flagship  === 1,
    mis:             row.mis       === 1,
    critical:        row.critical  === 1,
    thirdParty:      row.third_party === 1,
    overallStatus:   row.overall_status,
    il_phases:       JSON.parse(row.il_phases  || '[]'),
    phases:          JSON.parse(row.phases     || '{}'),
    customData:      JSON.parse(row.custom_data || '{}'),
    assignedTo:      row.assigned_to,
    assignedStaffId: row.assigned_staff_id,
    createdAt:       row.created_at,
    createdBy:       row.created_by,
    updatedAt:       row.updated_at,
    updatedBy:       row.updated_by,
  };
}

function getAllRows() {
  return db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all().map(rowToProject);
}

/* GET /api/projects */
router.get('/', authMiddleware, (req, res) => {
  let projects = getAllRows();
  if (req.user.role === 'section_head' && req.user.division) {
    projects = projects.filter(p => p.division === req.user.division);
  }
  res.json(projects);
});

/* GET /api/projects/:id */
router.get('/:id', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Project not found.' });
  res.json(rowToProject(row));
});

/* POST /api/projects */
router.post('/', authMiddleware, (req, res) => {
  if (!['senior_manager','section_head'].includes(req.user.role))
    return res.status(403).json({ error: 'Insufficient permissions to create projects.' });

  const p   = req.body;
  const id  = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`INSERT INTO projects (
    id, parent_code, project, theme, division, status, category, fy,
    live_target, live_actual, manhours, direct_cost, proactive_defect, use_cases,
    flagship, mis, critical, third_party, overall_status,
    il_phases, phases, custom_data, assigned_to, assigned_staff_id,
    created_at, created_by, updated_at, updated_by
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id, p.parentCode||null, p.project, p.theme||null, p.division||null,
    p.status||null, p.category||null, p.fy||null,
    p.liveTarget||null, p.liveActual||null,
    p.manhours||null, p.directCost||null, p.proactiveDefect||null, p.useCases||null,
    p.flagship?1:0, p.mis?1:0, p.critical?1:0, p.thirdParty?1:0,
    p.overallStatus||null,
    JSON.stringify(p.il_phases||[]), JSON.stringify(p.phases||{}), JSON.stringify(p.customData||{}),
    p.assignedTo||null, p.assignedStaffId||null,
    now, req.user.email, now, req.user.email
  );

  db.prepare(`INSERT INTO audit_log (id,project_id,project_name,user_id,user_name,role,action,timestamp)
    VALUES (?,?,?,?,?,?,?,?)`).run(uuidv4(), id, p.project, req.user.uid, req.user.name, req.user.role, 'created', now);

  _broadcast('projects_changed', getAllRows());
  triggerExcelRewrite(db);
  res.status(201).json({ id });
});

/* PUT /api/projects/:id */
router.put('/:id', authMiddleware, (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found.' });

  const u = req.user;
  if (u.role === 'viewer') return res.status(403).json({ error: 'Read-only access.' });
  if (u.role === 'deputy_manager' && existing.assigned_to !== u.uid)
    return res.status(403).json({ error: 'You can only edit projects assigned to you.' });

  const p   = req.body;
  const now = new Date().toISOString();

  if (u.role !== 'senior_manager') {
    // Role-based approval: send to admin instead of directly saving
    const adminRows = db.prepare("SELECT email FROM users WHERE role = 'senior_manager'").all();
    const adminEmails = adminRows.map(r => r.email);

    db.prepare(`INSERT INTO notifications (id, type, title, body, to_users, from_user, from_name, project_id, project_name, status, changes_json, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(uuidv4(), 'edit_approval', 'Pending Project Edit', `${u.name} proposed edits to project: ${existing.project}`, JSON.stringify(adminEmails), u.uid, u.name, req.params.id, existing.project, 'pending', JSON.stringify(p), now);
    
    // Broadcast notification change
    const notifs = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC').all();
    _broadcast('notifications_changed', notifs);
    return res.status(202).json({ accepted: true, message: 'Edits submitted for admin approval.' });
  }

  db.prepare(`UPDATE projects SET
    parent_code=?, project=?, theme=?, division=?, status=?, category=?, fy=?,
    live_target=?, live_actual=?, manhours=?, direct_cost=?, proactive_defect=?, use_cases=?,
    flagship=?, mis=?, critical=?, third_party=?, overall_status=?,
    il_phases=?, phases=?, custom_data=?, assigned_to=?, assigned_staff_id=?,
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
    p.assignedTo||null, p.assignedStaffId||null,
    now, req.user.email,
    req.params.id
  );

  if (p.assignedStaffId && p.assignedStaffId !== existing.assigned_staff_id) {
    const targetUser = db.prepare('SELECT * FROM users WHERE staff_no = ?').get(p.assignedStaffId);
    if (targetUser) {
      db.prepare(`INSERT INTO notifications (id, type, title, body, to_users, from_user, from_name, project_id, project_name, status, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      ).run(uuidv4(), 'assignment', 'New Project Assignment', `You have been assigned to project: ${p.project}`, JSON.stringify([targetUser.email]), req.user.uid, req.user.name, req.params.id, p.project, 'pending', now);
    }
  }

  db.prepare(`INSERT INTO audit_log (id,project_id,project_name,user_id,user_name,role,action,timestamp)
    VALUES (?,?,?,?,?,?,?,?)`).run(uuidv4(), req.params.id, p.project, u.uid, u.name, u.role, 'updated', now);

  _broadcast('projects_changed', getAllRows());
  triggerExcelRewrite(db);
  res.json({ ok: true });
});

/* PUT /api/projects/:id/approve_edit */
router.put('/:id/approve_edit', authMiddleware, (req, res) => {
  if (req.user.role !== 'senior_manager') return res.status(403).json({ error: 'Only admins can approve edits.' });
  
  const notifId = req.body.notificationId;
  const notif = db.prepare("SELECT * FROM notifications WHERE id = ? AND type = 'edit_approval'").get(notifId);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });
  
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found.' });

  const p = JSON.parse(notif.changes_json);
  const now = new Date().toISOString();

  db.prepare(`UPDATE projects SET
    parent_code=?, project=?, theme=?, division=?, status=?, category=?, fy=?,
    live_target=?, live_actual=?, manhours=?, direct_cost=?, proactive_defect=?, use_cases=?,
    flagship=?, mis=?, critical=?, third_party=?, overall_status=?,
    il_phases=?, phases=?, custom_data=?, assigned_to=?, assigned_staff_id=?,
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
    p.assignedTo||null, p.assignedStaffId||null,
    now, notif.from_name,
    req.params.id
  );

  db.prepare("UPDATE notifications SET status = 'approved', updated_at = ? WHERE id = ?").run(now, notifId);

  db.prepare(`INSERT INTO audit_log (id,project_id,project_name,user_id,user_name,role,action,timestamp)
    VALUES (?,?,?,?,?,?,?,?)`).run(uuidv4(), req.params.id, p.project, req.user.uid, req.user.name, req.user.role, 'edit_approved', now);

  _broadcast('projects_changed', getAllRows());
  _broadcast('notifications_changed', db.prepare('SELECT * FROM notifications ORDER BY created_at DESC').all());
  triggerExcelRewrite(db);
  res.json({ ok: true });
});

/* DELETE /api/projects/:id */
router.delete('/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'senior_manager')
    return res.status(403).json({ error: 'Only Senior Managers can delete projects.' });

  const existing = db.prepare('SELECT project FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found.' });

  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);

  const now = new Date().toISOString();
  db.prepare(`INSERT INTO audit_log (id,project_id,project_name,user_id,user_name,role,action,timestamp)
    VALUES (?,?,?,?,?,?,?,?)`).run(uuidv4(), req.params.id, existing.project, req.user.uid, req.user.name, req.user.role, 'deleted', now);

  _broadcast('projects_changed', getAllRows());
  triggerExcelRewrite(db);
  res.json({ ok: true });
});

module.exports = { router, setBroadcast };
