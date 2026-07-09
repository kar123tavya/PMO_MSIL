// ═══════════════════════════════════════════════════════
//  routes/notifications.js
//  GET    /api/notifications          — list for current user
//  GET    /api/notifications/count    — unread badge count
//  POST   /api/notifications          — create approval request
//  PATCH  /api/notifications/:id      — approve / reject / mark-read
//  DELETE /api/notifications/:id      — delete (senior manager only)
// ═══════════════════════════════════════════════════════
'use strict';

const express = require('express');
const router  = express.Router();
const { db, uuidv4 } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

let _broadcast = () => {};
function setBroadcast(fn) { _broadcast = fn; }

// ── Helper ──────────────────────────────────────────
function userSees(n, user) {
  const toUsers = JSON.parse(n.to_users || '[]');
  const ccUsers = JSON.parse(n.cc_users || '[]');
  if (user.role === 'admin' || user.role === 'department_head') return true; // Admins and Dept Heads see all approvals
  if (n.from_user === user.email)    return true;         // sender sees their own
  if (toUsers.includes(user.email))  return true;
  if (ccUsers.includes(user.email))  return true;
  return false;
}

// ── GET /api/notifications/count ─────────────────────
router.get('/count', authMiddleware, (req, res) => {
  try {
    const all = db.prepare('SELECT read_by, to_users, cc_users, from_user FROM notifications ORDER BY created_at DESC').all();
    let count = 0;
    for (const n of all) {
      if (!userSees(n, req.user)) continue;
      const readBy = JSON.parse(n.read_by || '[]');
      if (!readBy.includes(req.user.uid)) count++;
    }
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/notifications ────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100').all();
    const mine = rows
      .filter(n => userSees(n, req.user))
      .map(n => ({
        ...n,
        to_users:     JSON.parse(n.to_users  || '[]'),
        cc_users:     JSON.parse(n.cc_users  || '[]'),
        read_by:      JSON.parse(n.read_by   || '[]'),
        changes_json: n.changes_json ? JSON.parse(n.changes_json) : null,
        isUnread:     !JSON.parse(n.read_by || '[]').includes(req.user.uid),
      }));
    res.json(mine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/notifications ───────────────────────────
router.post('/', authMiddleware, (req, res) => {
  try {
    const {
      type = 'approval_request',
      title, body,
      to_users = [],
      cc_users = [],
      project_id, project_name,
      priority = 'normal',
      changes_json,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });

    const id  = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`INSERT INTO notifications
      (id, type, title, body, to_users, cc_users, from_user, from_name,
       project_id, project_name, status, priority, changes_json, read_by, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      id, type, title, body || '',
      JSON.stringify(to_users),
      JSON.stringify(cc_users),
      req.user.email, req.user.name,
      project_id || null, project_name || null,
      'pending', priority,
      changes_json ? JSON.stringify(changes_json) : null,
      JSON.stringify([req.user.uid]),
      now
    );

    const created = db.prepare('SELECT * FROM notifications WHERE id=?').get(id);
    _broadcast('notification_new', { id, type, title, priority, from_name: req.user.name });

    res.status(201).json({ ...created, to_users, cc_users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/notifications/:id ─────────────────────
router.patch('/:id', authMiddleware, (req, res) => {
  try {
    const n = db.prepare('SELECT * FROM notifications WHERE id=?').get(req.params.id);
    if (!n) return res.status(404).json({ error: 'Not found' });

    const { action } = req.body; // 'approve', 'reject', 'read', 'unread'
    const now = new Date().toISOString();

    if (action === 'read' || action === 'unread') {
      const readBy = JSON.parse(n.read_by || '[]');
      const idx = readBy.indexOf(req.user.uid);
      if (action === 'read' && idx === -1) readBy.push(req.user.uid);
      if (action === 'unread' && idx > -1) readBy.splice(idx, 1);
      db.prepare('UPDATE notifications SET read_by=?, updated_at=? WHERE id=?').run(JSON.stringify(readBy), now, n.id);
    } else if (action === 'approve' || action === 'reject') {
      if (!['admin', 'department_head', 'division_head', 'section_head'].includes(req.user.role))
        return res.status(403).json({ error: 'Insufficient permissions to approve/reject.' });
      
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const newBody = `${n.body}\n\n**${action === 'approve' ? 'Approved' : 'Rejected'} by ${req.user.name} (${req.user.role})**`;
      
      db.prepare('UPDATE notifications SET status=?, body=?, updated_at=? WHERE id=?').run(newStatus, newBody, now, n.id);

      // Send a notification back to the original requester (PIC)
      const actionPastTense = action === 'approve' ? 'Approved' : 'Rejected';
      const returnId = uuidv4();
      db.prepare(`INSERT INTO notifications
        (id, type, title, body, to_users, cc_users, from_user, from_name,
         project_id, project_name, status, priority, read_by, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(
        returnId, 'general', `Your edit was ${actionPastTense}`,
        `Your proposed edit for **${n.project_name || 'Project'}** was ${actionPastTense.toLowerCase()} by ${req.user.name}.`,
        JSON.stringify([n.from_user]), '[]',
        'system', 'System',
        n.project_id, n.project_name,
        'approved', 'normal', '[]', now
      );
      _broadcast('notification_new', { id: returnId, type: 'general', title: `Your edit was ${actionPastTense}`, priority: 'normal', from_name: 'System' });

      // Also log audit
      const { changes_json } = req.body;
      _broadcast('notification_updated', { id: n.id, status: action === 'approve' ? 'approved' : 'rejected' });
    }

    const updated = db.prepare('SELECT * FROM notifications WHERE id=?').get(n.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/notifications/:id ────────────────────
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    if (!['admin', 'department_head', 'division_head'].includes(req.user.role))
      return res.status(403).json({ error: 'Insufficient permissions to delete notifications.' });
    db.prepare('DELETE FROM notifications WHERE id=?').run(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, setBroadcast };
