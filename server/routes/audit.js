// ═══════════════════════════════════════════════════════
//  routes/audit.js
//  GET /api/audit         — paginated audit log
//  GET /api/audit/export  — audit log as Excel
// ═══════════════════════════════════════════════════════
'use strict';

const express = require('express');
const router  = express.Router();
const XLSX    = require('xlsx');
const { db }  = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

// ── GET /api/audit ────────────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  try {
    const { project_id, user_id, action, from, to, limit = 200, offset = 0 } = req.query;
    let sql    = 'SELECT * FROM audit_log WHERE 1=1';
    const args = [];

    if (project_id) { sql += ' AND project_id=?'; args.push(project_id); }
    if (user_id)    { sql += ' AND user_id=?';    args.push(user_id); }
    if (action)     { sql += ' AND action=?';     args.push(action); }
    if (from)       { sql += ' AND timestamp>=?'; args.push(from); }
    if (to)         { sql += ' AND timestamp<=?'; args.push(to + 'T23:59:59'); }

    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    args.push(Number(limit), Number(offset));

    const rows  = db.prepare(sql).all(...args);
    const total = db.prepare('SELECT COUNT(*) AS cnt FROM audit_log').get().cnt;

    res.json({ rows, total, limit: Number(limit), offset: Number(offset) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/audit/export ─────────────────────────────
router.get('/export', authMiddleware, (req, res) => {
  try {
    // Allowed for all authenticated users; authMiddleware ensures they are logged in.
    
    const rows = db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC').all();
    const data = [
      ['Timestamp', 'Project', 'Action', 'User', 'Role', 'Field Changed', 'From', 'To'],
      ...rows.map(r => [
        r.timestamp, r.project_name, r.action, r.user_name, r.role,
        r.field_name || '', r.from_val || '', r.to_val || '',
      ]),
    ];

    const ws  = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 24 }, { wch: 30 }, { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 30 }, { wch: 30 }];
    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    const buf   = Buffer.from(wbout, 'binary');

    res.setHeader('Content-Disposition', 'attachment; filename="Audit_Log.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/audit/bulk ────────────────────────────
router.delete('/bulk', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only Admins can delete audit logs.' });
    }
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Please provide both from and to dates.' });
    
    // Add time boundary to 'to'
    const toBound = to.includes('T') ? to : to + 'T23:59:59';
    
    const info = db.prepare('DELETE FROM audit_log WHERE timestamp >= ? AND timestamp <= ?').run(from, toBound);
    res.json({ success: true, deletedCount: info.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/audit/:id ─────────────────────────────
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only Admins can delete audit logs.' });
    }
    const info = db.prepare('DELETE FROM audit_log WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Audit log not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
