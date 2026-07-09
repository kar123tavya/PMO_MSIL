// ═══════════════════════════════════════════════════════
//  routes/settings.js — Custom Columns & IL Phases
// ═══════════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const { db }  = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

let _broadcast = () => {};
function setBroadcast(fn) { _broadcast = fn; }

/* ──────────────── CUSTOM COLUMNS ──────────────── */

router.get('/columns', authMiddleware, (req, res) => {
  try {
    const isSM = ['senior_manager', 'admin', 'section_head'].includes(req.user.role);
    let cols;
    if (isSM) {
      cols = db.prepare("SELECT * FROM custom_columns ORDER BY created_at ASC").all();
    } else {
      cols = db.prepare("SELECT * FROM custom_columns WHERE status='approved' ORDER BY created_at ASC").all();
    }
    cols.forEach(c => c.views = JSON.parse(c.views || '[]'));
    res.json(cols);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/columns', authMiddleware, (req, res) => {
  try {
    const { id, label, type, views } = req.body;
    const isAdmin = ['senior_manager', 'admin', 'section_head'].includes(req.user.role);
    // Admin changes are instantly approved; PIC changes need approval
    const status = isAdmin ? 'approved' : 'pending';
    const now = new Date().toISOString();
    const { v4: uuidv4 } = require('uuid');

    db.prepare(`INSERT INTO custom_columns (id, label, type, views, status, created_by, created_at) VALUES (?,?,?,?,?,?,?)`)
      .run(id, label, type, JSON.stringify(views||[]), status, req.user.email, now);

    if (isAdmin) {
      // Broadcast the column change to all connected clients immediately
      _broadcast('settings_changed', { key: 'custom_columns', value: null });
      // Notify all PICs about the new column
      const pics = db.prepare("SELECT id, name FROM users WHERE role='pic' AND status='active'").all();
      pics.forEach(pic => {
        db.prepare(`INSERT INTO notifications (id, type, title, body, to_users, status, priority, created_at)
          VALUES (?,?,?,?,?,?,?,?)`.replace(/\n\s+/g, ' '))
          .run(uuidv4(), 'column_update', 'Dashboard Column Updated',
            `Admin ${req.user.name} added a new column: "${label}" to the dashboard.`,
            JSON.stringify([pic.id]), 'unread', 'normal', now);
      });
    } else {
      // Non-admin: send approval request notification to admins
      db.prepare(`INSERT INTO notifications (id, type, title, body, status, priority, created_at) VALUES (?,?,?,?,?,?,?)`)
        .run(uuidv4(), 'column_approval', 'New Column Request',
          `${req.user.name} proposed a new column: "${label}". Please review and approve.`,
          'pending', 'high', now);
    }

    res.json({ ok: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/columns/:id/approve', authMiddleware, (req, res) => {
  if (!['senior_manager', 'admin', 'section_head'].includes(req.user.role))
    return res.status(403).json({ error: 'Unauthorized' });
  try {
    db.prepare("UPDATE custom_columns SET status='approved' WHERE id=?").run(req.params.id);
    _broadcast('columns_changed', null);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/columns/:id', authMiddleware, (req, res) => {
  if (!['senior_manager', 'admin', 'section_head'].includes(req.user.role))
    return res.status(403).json({ error: 'Unauthorized' });
  try {
    db.prepare("DELETE FROM custom_columns WHERE id=?").run(req.params.id);
    _broadcast('columns_changed', null);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────── GENERIC SETTINGS ──────────────── */

router.post('/phases/add_subtask', authMiddleware, (req, res) => {
  if (!['senior_manager', 'admin', 'section_head'].includes(req.user.role))
    return res.status(403).json({ error: 'Unauthorized' });
  
  const { phaseId, taskName } = req.body;
  if (!phaseId || !taskName) return res.status(400).json({ error: 'Missing phaseId or taskName' });

  try {
    const row = db.prepare("SELECT value FROM settings WHERE key='il_phases'").get();
    if (row) {
      const phases = JSON.parse(row.value);
      const target = phases.find(p => p.id === phaseId);
      if (target) {
        target.subtasks.push(taskName);
        db.prepare("UPDATE settings SET value=?, updated_at=? WHERE key='il_phases'")
          .run(JSON.stringify(phases), new Date().toISOString());
        _broadcast('settings_changed', { key: 'il_phases', value: phases });
        return res.json({ ok: true });
      }
    }
    res.status(404).json({ error: 'Phase not found globally' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* GET /api/settings/:key */
router.get('/:key', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
  if (!row) return res.json({ value: null });
  try { res.json({ value: JSON.parse(row.value) }); }
  catch { res.json({ value: row.value }); }
});

/* POST /api/settings/:key */
router.post('/:key', authMiddleware, (req, res) => {
  if (!['senior_manager', 'admin'].includes(req.user.role))
    return res.status(403).json({ error: 'Only Senior Managers can change settings.' });

  const { value } = req.body;
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?,?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`
  ).run(req.params.key, JSON.stringify(value), now);

  _broadcast('settings_changed', { key: req.params.key, value });
  res.json({ ok: true });
});

/* POST /api/settings/trigger-emails */
router.post('/trigger-emails', authMiddleware, (req, res) => {
  if (!['senior_manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Only admins can trigger emails' });
  
  const { processDeadlines } = require('../services/cronService');
  processDeadlines();
  
  res.json({ message: 'Email processing job triggered in the background.' });
});

module.exports = { router, setBroadcast };
