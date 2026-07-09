// ═══════════════════════════════════════════════════════
//  routes/users.js — User Management
// ═══════════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const { db, uuidv4 } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

let _broadcast = () => {};
function setBroadcast(fn) { _broadcast = fn; }

function rowToUser(row) {
  return {
    uid:         row.id,
    name:        row.name,
    email:       row.email,
    role:        row.role,
    department:  row.department,
    division:    row.division,
    section:     row.section,
    staffNo:     row.staff_no,
    designation: row.designation,
    status:      row.status,
    createdAt:   row.created_at,
  };
}

/* GET /api/users */
router.get('/', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY name').all();
  res.json(rows.map(rowToUser));
});

/* GET /api/users/:id */
router.get('/:id', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'User not found.' });
  res.json(rowToUser(row));
});

/* GET /api/users/by-email/:email */
router.get('/by-email/:email', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(req.params.email.toLowerCase());
  if (!row) return res.status(404).json({ error: 'User not found.' });
  res.json(rowToUser(row));
});

/* POST /api/users  — create or update */
router.post('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'department_head')
    return res.status(403).json({ error: 'Only Admins and Department Heads can manage users.' });

  const { uid, name, email, password, role, department, division, section, staffNo, designation, status } = req.body;
  const now = new Date().toISOString();

  if (uid && uid !== '__new__') {
    // Update existing
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
    if (!existing) return res.status(404).json({ error: 'User not found.' });

    let hash = existing.password_hash;
    if (password && password.trim()) hash = bcrypt.hashSync(password, 10);

    db.prepare(`UPDATE users SET name=?, role=?, department=?, division=?, section=?, staff_no=?, designation=?, status=?, password_hash=?, updated_at=?
      WHERE id=?`
    ).run(name, role, department||null, division||null, section||null, staffNo||null, designation||null, status||'active', hash, now, uid);

    _broadcast('users_changed', null);
    return res.json({ uid });
  } else {
    // Create new
    if (!email || !password) return res.status(400).json({ error: 'Email and password required for new user.' });
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'Email already in use.' });

    const hash = bcrypt.hashSync(password, 10);
    const id   = uuidv4();
    db.prepare(`INSERT INTO users (id,name,email,password_hash,role,department,division,section,staff_no,designation,status,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(id, name, email.toLowerCase(), hash, role||'deputy_manager', department||null, division||null, section||null, staffNo||null, designation||null, status||'active', now);

    _broadcast('users_changed', null);
    return res.status(201).json({ uid: id });
  }
});

/* PUT /api/users/:id/approve */
router.put('/:id/approve', authMiddleware, (req, res) => {
  if (req.user.role !== 'senior_manager') return res.status(403).json({ error: 'Forbidden.' });
  db.prepare("UPDATE users SET status='active', updated_at=? WHERE id=?").run(new Date().toISOString(), req.params.id);
  _broadcast('users_changed', null);
  res.json({ ok: true });
});

/* DELETE /api/users/:id */
router.delete('/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'senior_manager') return res.status(403).json({ error: 'Forbidden.' });
  if (req.params.id === req.user.uid) return res.status(400).json({ error: 'Cannot delete your own account.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  _broadcast('users_changed', null);
  res.json({ ok: true });
});

module.exports = { router, setBroadcast };
