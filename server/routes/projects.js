// ═══════════════════════════════════════════════════════
//  routes/projects.js — Project CRUD
// ═══════════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const { db, uuidv4 } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');
const { sendApprovalEmail } = require('../services/emailService');
const { triggerExcelRewrite } = require('../services/excelSyncService');

function computeDiffs(p, existing) {
  const diffs = [];
  const m = {
    project: 'Project Name', theme: 'Theme', division: 'Division', status: 'Status', category: 'Category', fy: 'FY',
    liveTarget: 'live_target', liveActual: 'live_actual', manhours: 'Manhours', directCost: 'direct_cost', proactiveDefect: 'proactive_defect', useCases: 'use_cases',
    flagship: 'Flagship', mis: 'MIS', critical: 'Critical', thirdParty: 'third_party', overallStatus: 'overall_status', assignedStaffId: 'assigned_staff_id'
  };
  const labels = {
    live_target: 'Live Target', live_actual: 'Live Actual', direct_cost: 'Direct Cost', proactive_defect: 'Proactive Defect', use_cases: 'Use Cases',
    third_party: 'Third Party', overall_status: 'Overall Status', assigned_staff_id: 'Assigned Staff ID'
  };
  
  for (const [jsonKey, snakeKeyOrLabel] of Object.entries(m)) {
    const snakeKey = labels[snakeKeyOrLabel] ? snakeKeyOrLabel : jsonKey.toLowerCase();
    const label = labels[snakeKeyOrLabel] || snakeKeyOrLabel;
    
    let from = existing[snakeKey];
    let to = p[jsonKey];
    if (typeof to === 'boolean') to = to ? 1 : 0;
    
    if (String(from || '') !== String(to || '')) {
       diffs.push({ field: label, from: String(from || ''), to: String(to || '') });
    }
  }
  
  try {
    const oldPhases = JSON.parse(existing.il_phases || '[]');
    const newPhases = p.il_phases || [];
    newPhases.forEach(nph => {
      const oph = oldPhases.find(x => x.id === nph.id);
      if (oph) {
         if (String(oph.targetStart||'') !== String(nph.targetStart||'')) diffs.push({ field: `${nph.id.toUpperCase()} Target Start`, from: oph.targetStart||'', to: nph.targetStart||'' });
         if (String(oph.targetEnd||'') !== String(nph.targetEnd||'')) diffs.push({ field: `${nph.id.toUpperCase()} Target End`, from: oph.targetEnd||'', to: nph.targetEnd||'' });
         if (String(oph.actualStart||'') !== String(nph.actualStart||'')) diffs.push({ field: `${nph.id.toUpperCase()} Actual Start`, from: oph.actualStart||'', to: nph.actualStart||'' });
         if (String(oph.actualEnd||'') !== String(nph.actualEnd||'')) diffs.push({ field: `${nph.id.toUpperCase()} Actual End`, from: oph.actualEnd||'', to: nph.actualEnd||'' });
         
         if (oph.phaseColor !== nph.phaseColor) diffs.push({ field: `${nph.id.toUpperCase()} Color`, from: oph.phaseColor||'', to: nph.phaseColor||'' });
         
         const oldSubs = oph.subtasks || [];
         const newSubs = nph.subtasks || [];
         newSubs.forEach((nst, i) => {
            const ost = oldSubs[i];
            if (ost) {
              if (ost.done !== nst.done) diffs.push({ field: `${nph.id.toUpperCase()} Subtask [${nst.label||i}] Done`, from: ost.done?'Yes':'No', to: nst.done?'Yes':'No' });
              if (String(ost.targetStart||'') !== String(nst.targetStart||'')) diffs.push({ field: `${nph.id.toUpperCase()} Subtask [${nst.label||i}] Target Start`, from: ost.targetStart||'', to: nst.targetStart||'' });
              if (String(ost.targetEnd||'') !== String(nst.targetEnd||'')) diffs.push({ field: `${nph.id.toUpperCase()} Subtask [${nst.label||i}] Target End`, from: ost.targetEnd||'', to: nst.targetEnd||'' });
              if (String(ost.actualStart||'') !== String(nst.actualStart||'')) diffs.push({ field: `${nph.id.toUpperCase()} Subtask [${nst.label||i}] Actual Start`, from: ost.actualStart||'', to: nst.actualStart||'' });
              if (String(ost.actualEnd||'') !== String(nst.actualEnd||'')) diffs.push({ field: `${nph.id.toUpperCase()} Subtask [${nst.label||i}] Actual End`, from: ost.actualEnd||'', to: nst.actualEnd||'' });
            }
         });
      }
    });
  } catch(e) { console.error('Diff error', e) }
  return diffs;
}

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
    buEmail:         row.bu_email,
    il4Learnings:    row.il4_learnings,
    effortScores:    JSON.parse(row.effort_scores || '{}'),
  };
}

function getAllRows() {
  return db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all().map(rowToProject);
}

/* GET /api/projects */
router.get('/', authMiddleware, (req, res) => {
  let projects = getAllRows();
  // We no longer restrict the GET feed!
  // PICs and Heads default to their divisions on the frontend, but can view everything.
  res.json(projects);
});

/* GET /api/projects/:id */
router.get('/export', authMiddleware, (req, res) => {
  try {
    const file = path.join(__dirname, '..', 'exports', 'PMO_Master.xlsx');
    res.download(file, 'PMO_Master.xlsx');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/fixdb', (req, res) => {
  const rows = db.prepare('SELECT id, to_users, cc_users, from_user FROM notifications').all();
  let count = 0;
  rows.forEach(row => {
    let toUsers = JSON.parse(row.to_users || '[]');
    let ccUsers = JSON.parse(row.cc_users || '[]');
    let fromUser = row.from_user;
    
    const fix = (val) => {
      if (val && val.length === 36 && val.includes('-')) {
        const u = db.prepare('SELECT email FROM users WHERE id=?').get(val);
        return u ? u.email : val;
      }
      return val;
    };
    
    const newTo = toUsers.map(fix);
    const newCc = ccUsers.map(fix);
    const newFrom = fix(fromUser);
    
    if (JSON.stringify(newTo) !== JSON.stringify(toUsers) || JSON.stringify(newCc) !== JSON.stringify(ccUsers) || newFrom !== fromUser) {
      db.prepare('UPDATE notifications SET to_users=?, cc_users=?, from_user=? WHERE id=?').run(JSON.stringify(newTo), JSON.stringify(newCc), newFrom, row.id);
      count++;
    }
  });
  res.json({ ok: true, fixed: count });
});

router.get('/:id', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Project not found.' });
  res.json(rowToProject(row));
});

/* POST /api/projects */
router.post('/', authMiddleware, (req, res) => {
  if (req.user.role === 'viewer')
    return res.status(403).json({ error: 'Insufficient permissions to create projects.' });

  const p   = req.body;
  const id  = uuidv4();
  const now = new Date();
  
  let pCode = p.parentCode;
  if (!pCode) {
    let fyCode = '0000';
    if (p.fy) {
      // Extract numbers from fy string e.g. "2026-27" or "26-27"
      const nums = p.fy.match(/\d+/g);
      if (nums && nums.length >= 2) {
        let yr1 = nums[0].slice(-2);
        let yr2 = nums[1].slice(-2);
        fyCode = yr1 + yr2;
      }
    } else {
      // Derive from current date
      const yr = now.getFullYear();
      const mo = now.getMonth() + 1;
      let yr1 = mo >= 4 ? yr : yr - 1;
      let yr2 = yr1 + 1;
      fyCode = String(yr1).slice(-2) + String(yr2).slice(-2);
    }

    const likePattern = `${fyCode}QAQD-%`;
    const rows = db.prepare('SELECT parent_code FROM projects WHERE parent_code LIKE ?').all(likePattern);
    
    let maxNum = 0;
    rows.forEach(r => {
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
    pCode = `${fyCode}QAQD-${nextNumStr}`;
  }
  
  const nowIso = now.toISOString();

  db.prepare(`INSERT INTO projects (
    id, parent_code, project, theme, division, status, category, fy,
    live_target, live_actual, manhours, direct_cost, proactive_defect, use_cases,
    flagship, mis, critical, third_party, overall_status,
    il_phases, phases, custom_data, assigned_to, assigned_staff_id, bu_email, il4_learnings, effort_scores,
    created_at, created_by, updated_at, updated_by
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id, pCode, p.project, p.theme||null, p.division||null,
    p.status||null, p.category||null, p.fy||null,
    p.liveTarget||null, p.liveActual||null,
    p.manhours||null, p.directCost||null, p.proactiveDefect||null, p.useCases||null,
    p.flagship?1:0, p.mis?1:0, p.critical?1:0, p.thirdParty?1:0,
    p.overallStatus||null,
    JSON.stringify(p.il_phases||[]), JSON.stringify(p.phases||{}), JSON.stringify(p.customData||{}),
    p.assignedTo||null, p.assignedStaffId||null,
    p.buEmail||null, p.il4Learnings||null, JSON.stringify(p.effortScores||{}),
    nowIso, req.user.email, nowIso, req.user.email
  );

  db.prepare(`INSERT INTO audit_log (id,project_id,project_name,user_id,user_name,role,action,timestamp)
    VALUES (?,?,?,?,?,?,?,?)`).run(uuidv4(), id, p.project, req.user.uid, req.user.name, req.user.role, 'created', nowIso);

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
  if (u.role === 'pic' && existing.assigned_to !== u.email && existing.division === u.division) {
    // allowed if it's in their division, or if they give a cross division reason.
  }

  const p   = req.body;
  const now = new Date().toISOString();

  // If a PIC edits, it requires multi-tier approval
  if (u.role === 'pic') {
    let approvers = [];
    let ccUsers = [];

    const getManagers = (email) => {
      let tl = null, sic = null, dpm = null;
      let curr = db.prepare('SELECT manager_email, role FROM users WHERE email=?').get(email);
      
      if (curr && curr.manager_email && curr.role === 'pic') {
         tl = curr.manager_email;
         curr = db.prepare('SELECT manager_email, role FROM users WHERE email=?').get(curr.manager_email);
      } else if (curr && curr.role === 'tl') {
         // handle case where the target is a TL
         tl = email;
      }
      
      if (curr && curr.manager_email && curr.role === 'tl') {
         sic = curr.manager_email;
         curr = db.prepare('SELECT manager_email, role FROM users WHERE email=?').get(curr.manager_email);
      } else if (curr && curr.role === 'sic') {
         sic = email;
      }
      
      if (curr && curr.manager_email && curr.role === 'sic') {
         dpm = curr.manager_email;
      }
      return { tl, sic, dpm };
    };

    let notifBody = `${u.name} proposed edits to project: ${existing.project}`;
    let dpmToNotify = null;

    if (existing.division === u.division) {
      // Intra-division: PIC's own managers
      const mgrs = getManagers(u.email);
      if (mgrs.tl) approvers.push(mgrs.tl);
      if (mgrs.sic) approvers.push(mgrs.sic);
      dpmToNotify = mgrs.dpm;
    } else {
      // Cross-division: Target project's PIC's managers
      if (p._crossDivisionReason) {
        notifBody += `\n\n**Cross-Division Edit Reason:** ${p._crossDivisionReason}`;
      }
      const targetPicEmail = existing.assigned_to;
      if (targetPicEmail) {
        ccUsers.push(targetPicEmail); // Notify the target PIC
        const mgrs = getManagers(targetPicEmail);
        if (mgrs.tl) approvers.push(mgrs.tl);
        if (mgrs.sic) approvers.push(mgrs.sic);
        dpmToNotify = mgrs.dpm;
      }
    }

    const adminRows = db.prepare("SELECT email FROM users WHERE role = 'admin'").all();
    const adminEmails = adminRows.map(r => r.email);

    if (approvers.length === 0) {
       approvers.push(...adminEmails); // fallback to admin
    } else {
       // Also allow admins to see and approve anything
       approvers.push(...adminEmails);
    }
    
    // De-duplicate
    approvers = [...new Set(approvers.filter(Boolean))];
    ccUsers = [...new Set(ccUsers.filter(Boolean))];

    // Encode DPM info into the custom_data field of the notification so we know who to notify later
    const customData = JSON.stringify({ dpm_email: dpmToNotify });

    db.prepare(`INSERT INTO notifications (id, type, title, body, to_users, cc_users, from_user, from_name, project_id, project_name, status, changes_json, custom_data, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(uuidv4(), 'edit_approval', 'Pending Project Edit', notifBody, JSON.stringify(approvers), JSON.stringify(ccUsers), u.email, u.name, req.params.id, existing.project, 'pending', JSON.stringify(p), customData, now);
    
    // Broadcast notification change
    const notifs = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC').all();
    _broadcast('notifications_changed', notifs);
    
    // Send Email (optional, ignored for now as we simulate it)
    sendApprovalEmail([...approvers, ...ccUsers, u.email], {
      projectName: existing.project,
      requestedBy: u.name,
      division: existing.division || 'N/A',
      reason: p._crossDivisionReason || ''
    });

    return res.status(202).json({ accepted: true, message: 'Edits submitted for approval.' });
  }

  db.prepare(`UPDATE projects SET
    parent_code=?, project=?, theme=?, division=?, status=?, category=?, fy=?,
    live_target=?, live_actual=?, manhours=?, direct_cost=?, proactive_defect=?, use_cases=?,
    flagship=?, mis=?, critical=?, third_party=?, overall_status=?,
    il_phases=?, phases=?, custom_data=?, assigned_to=?, assigned_staff_id=?,
    bu_email=?, il4_learnings=?, effort_scores=?,
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
    p.buEmail||null, p.il4Learnings||null, JSON.stringify(p.effortScores||{}),
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

  const diffs = computeDiffs(p, existing);

  if (diffs.length > 0) {
    const stmt = db.prepare(`INSERT INTO audit_log (id,project_id,project_name,user_id,user_name,role,action,field_name,from_val,to_val,timestamp) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    for (const d of diffs) {
      stmt.run(uuidv4(), req.params.id, p.project, u.uid, u.name, u.role, 'updated', d.field, d.from, d.to, now);
    }
  } else {
    db.prepare(`INSERT INTO audit_log (id,project_id,project_name,user_id,user_name,role,action,timestamp)
      VALUES (?,?,?,?,?,?,?,?)`).run(uuidv4(), req.params.id, p.project, u.uid, u.name, u.role, 'updated', now);
  }

  _broadcast('projects_changed', getAllRows());
  triggerExcelRewrite(db);
  res.json({ ok: true });
});

/* PUT /api/projects/:id/approve_edit */
router.put('/:id/approve_edit', authMiddleware, (req, res) => {
  if (!['admin', 'dpm', 'sic', 'tl'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions to approve edits.' });
  }
  
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
    flagship=?, mis=?, critical=?, third_party=?, overall_status=?,
    il_phases=?, phases=?, custom_data=?, assigned_to=?, assigned_staff_id=?,
    bu_email=?, il4_learnings=?, effort_scores=?,
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
    p.buEmail||null, p.il4Learnings||null, JSON.stringify(p.effortScores||{}),
    now, notif.from_name,
    req.params.id
  );

  const diffs = computeDiffs(p, existing);

  db.prepare("UPDATE notifications SET status = 'approved', updated_at = ? WHERE id = ?").run(now, notifId);

  // If from_user is a UUID (from old bug), try to fetch the email, otherwise use as-is
  let targetEmail = notif.from_user;
  if (targetEmail && targetEmail.length === 36 && targetEmail.includes('-')) {
    const uRow = db.prepare('SELECT email FROM users WHERE id = ?').get(targetEmail);
    if (uRow) targetEmail = uRow.email;
  }

  // Send a notification back to the original requester (PIC)
  const returnId = uuidv4();
  db.prepare(`INSERT INTO notifications
    (id, type, title, body, to_users, cc_users, from_user, from_name,
     project_id, project_name, status, priority, read_by, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    returnId, 'general', 'Your edit was Approved',
    `Your proposed edit for **${p.project || 'Project'}** was approved by ${req.user.name}.`,
    JSON.stringify([targetEmail]), '[]',
    'system', 'System',
    req.params.id, p.project,
    'approved', 'normal', '[]', now
  );
  _broadcast('notification_new', { id: returnId, type: 'general', title: 'Your edit was Approved', priority: 'normal', from_name: 'System' });

  // Send a notification to the DPM if we captured their email during the request
  try {
    let ndata = {};
    if (notif.custom_data) ndata = JSON.parse(notif.custom_data);
    if (ndata.dpm_email) {
      const dpmId = uuidv4();
      db.prepare(`INSERT INTO notifications
        (id, type, title, body, to_users, cc_users, from_user, from_name, project_id, project_name, status, priority, read_by, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(dpmId, 'general', 'Project Edit Approved in your Department', 
        `An edit for project **${p.project}** originally requested by ${notif.from_name} was approved by ${req.user.name}.`,
        JSON.stringify([ndata.dpm_email]), '[]', 'system', 'System', req.params.id, p.project, 'approved', 'low', '[]', now);
      _broadcast('notification_new', { id: dpmId, type: 'general', title: 'Project Edit Approved in your Department', priority: 'low', from_name: 'System' });
    }
  } catch (e) {}

  if (diffs.length > 0) {
    const stmt = db.prepare(`INSERT INTO audit_log (id,project_id,project_name,user_id,user_name,role,action,field_name,from_val,to_val,timestamp) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    // Note: use notif.from_user and notif.from_name as the author of the edits
    for (const d of diffs) {
      stmt.run(uuidv4(), req.params.id, p.project, notif.from_user, notif.from_name, 'pic', 'edit_approved', d.field, d.from, d.to, now);
    }
  } else {
    db.prepare(`INSERT INTO audit_log (id,project_id,project_name,user_id,user_name,role,action,timestamp)
      VALUES (?,?,?,?,?,?,?,?)`).run(uuidv4(), req.params.id, p.project, notif.from_user, notif.from_name, 'pic', 'edit_approved', now);
  }

  _broadcast('projects_changed', getAllRows());
  _broadcast('notifications_changed', db.prepare('SELECT * FROM notifications ORDER BY created_at DESC').all());
  triggerExcelRewrite(db);
  res.json({ ok: true });
});

/* DELETE /api/projects/:id */
router.delete('/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only Admins can delete projects.' });

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

/* POST /api/projects/:id/effort_score */
router.post('/:id/effort_score', authMiddleware, (req, res) => {
  const existing = db.prepare('SELECT effort_scores FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found.' });

  const role = req.user.role; // expecting 'pic' or 'sic'
  if (!['pic', 'sic'].includes(role)) {
    return res.status(403).json({ error: 'Only PIC and SIC can submit effort scores.' });
  }

  let scores = {};
  try { scores = JSON.parse(existing.effort_scores || '{}'); } catch(e) {}
  
  // store confidentially using the role as key
  scores[role] = {
    bu: parseInt(req.body.bu || 0),
    pic: parseInt(req.body.pic || 0),
    sic: parseInt(req.body.sic || 0)
  };

  db.prepare('UPDATE projects SET effort_scores = ? WHERE id = ?').run(JSON.stringify(scores), req.params.id);
  
  // Do NOT write to audit log to maintain confidentiality!
  _broadcast('projects_changed', getAllRows());
  res.json({ ok: true });
});

module.exports = { router, setBroadcast };
