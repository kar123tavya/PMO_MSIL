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
    manager_email: row.manager_email,
    status:      row.status,
    photo_base64:  row.photo_base64,
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
  if (req.user.role !== 'admin' && req.user.role !== 'dpm')
    return res.status(403).json({ error: 'Only Admins and DPMs can manage users.' });

  const { uid, name, email, password, role, department, division, section, staffNo, designation, status, manager_email } = req.body;
  const now = new Date().toISOString();

  if (uid && uid !== '__new__') {
    // Update existing
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
    if (!existing) return res.status(404).json({ error: 'User not found.' });

    let hash = existing.password_hash;
    if (password && password.trim()) hash = bcrypt.hashSync(password, 10);

    db.prepare(`UPDATE users SET name=?, role=?, manager_email=?, department=?, division=?, section=?, staff_no=?, designation=?, status=?, password_hash=?, updated_at=?
      WHERE id=?`
    ).run(name, role, manager_email||null, department||null, division||null, section||null, staffNo||null, designation||null, status||'active', hash, now, uid);

    _broadcast('users_changed', null);
    return res.json({ uid });
  } else {
    // Create new
    if (!email || !password) return res.status(400).json({ error: 'Email and password required for new user.' });
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'Email already in use.' });

    const hash = bcrypt.hashSync(password, 10);
    const id   = uuidv4();
    db.prepare(`INSERT INTO users (id,name,email,password_hash,role,manager_email,department,division,section,staff_no,designation,status,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(id, name, email.toLowerCase(), hash, role||'viewer', manager_email||null, department||null, division||null, section||null, staffNo||null, designation||null, status||'active', now);

    _broadcast('users_changed', null);
    return res.status(201).json({ uid: id });
  }
});

/* PUT /api/users/:id/approve */
router.put('/:id/approve', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'dpm') return res.status(403).json({ error: 'Forbidden.' });
  db.prepare("UPDATE users SET status='active', updated_at=? WHERE id=?").run(new Date().toISOString(), req.params.id);
  _broadcast('users_changed', null);
  res.json({ ok: true });
});

/* PUT /api/users/profile - Self profile update */
router.put('/profile', authMiddleware, (req, res) => {
  const { email, password, name, staffNo, photo_base64 } = req.body;
  const uid = req.user.uid;
  
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email cannot be empty.' });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name cannot be empty.' });
  }

  // Check if email belongs to someone else
  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.trim().toLowerCase(), uid);
  if (existing) {
    return res.status(409).json({ error: 'Email is already in use by another account.' });
  }

  const now = new Date().toISOString();
  let updateQuery = `UPDATE users SET name=?, email=?, staff_no=?, photo_base64=?, updated_at=? WHERE id=?`;
  let params = [name.trim(), email.trim().toLowerCase(), staffNo||null, photo_base64||null, now, uid];

  if (password && password.trim()) {
    const hash = bcrypt.hashSync(password.trim(), 10);
    updateQuery = `UPDATE users SET name=?, email=?, staff_no=?, photo_base64=?, password_hash=?, updated_at=? WHERE id=?`;
    params = [name.trim(), email.trim().toLowerCase(), staffNo||null, photo_base64||null, hash, now, uid];
  }

  db.prepare(updateQuery).run(...params);
  _broadcast('users_changed', null);
  res.json({ ok: true, message: 'Profile updated successfully.' });
});

/* DELETE /api/users/:id */
router.delete('/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'dpm') return res.status(403).json({ error: 'Forbidden.' });
  if (req.params.id === req.user.uid) return res.status(400).json({ error: 'Cannot delete your own account.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  _broadcast('users_changed', null);
  res.json({ ok: true });
});

module.exports = { router, setBroadcast };
