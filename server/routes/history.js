// ═══════════════════════════════════════════════════════
//  routes/history.js — Audit Log
// ═══════════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const { db, uuidv4 } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

/* GET /api/history — all entries (latest first) */
router.get('/', authMiddleware, (req, res) => {
  const limit = parseInt(req.query.limit) || 300;
  const rows  = db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?').all(limit);
  res.json(rows.map(r => ({
    id:          r.id,
    projectId:   r.project_id,
    projectName: r.project_name,
    userId:      r.user_id,
    userName:    r.user_name,
    role:        r.role,
    action:      r.action,
    field:       r.field_name,
    from:        r.from_val,
    to:          r.to_val,
    when:        r.timestamp,
  })));
});

/* GET /api/history/:projectId — per-project entries */
router.get('/:projectId', authMiddleware, (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM audit_log WHERE project_id = ? ORDER BY timestamp DESC LIMIT 50'
  ).all(req.params.projectId);
  res.json(rows.map(r => ({
    id:          r.id,
    projectName: r.project_name,
    userName:    r.user_name,
    role:        r.role,
    action:      r.action,
    field:       r.field_name,
    from:        r.from_val,
    to:          r.to_val,
    when:        r.timestamp,
  })));
});

/* POST /api/history — log entry from frontend */
router.post('/', authMiddleware, (req, res) => {
  const e   = req.body;
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO audit_log (id,project_id,project_name,user_id,user_name,role,action,field_name,from_val,to_val,timestamp)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(uuidv4(), e.projectId||null, e.projectName||null, req.user.uid, req.user.name, req.user.role,
        e.action||'update', e.field||null, e.from||null, e.to||null, now);
  res.status(201).json({ ok: true });
});

module.exports = router;
