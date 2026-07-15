// ═══════════════════════════════════════════════════════
//  routes/auth.js — Login & Registration
// ═══════════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { db, uuidv4 } = require('../db/schema');
const { JWT_SECRET } = require('../middleware/auth');

/* POST /api/auth/login */
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

  if (!bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid email or password.' });

  if (user.status === 'disabled')
    return res.status(403).json({ error: 'This account has been disabled.' });
  if (user.status === 'pending')
    return res.status(403).json({ error: 'Your account is pending admin approval.' });

  const payload = {
    uid:         user.id,
    name:        user.name,
    email:       user.email,
    role:        user.role,
    division:    user.division    || null,
    staffNo:     user.staff_no    || null,
    designation: user.designation || null,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: payload });
});

/* POST /api/auth/register */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, division, department, section, staffNo, designation } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    
    // Default role is pic if not provided or invalid
    const validRoles = ['admin', 'dpm', 'sic', 'tl', 'pic', 'viewer'];
    const assignedRole = validRoles.includes(role) ? role : 'pic';

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, department, division, section, staff_no, designation, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).run(id, name, email.trim().toLowerCase(), hash, assignedRole, department||null, division||null, section||null, staffNo||null, designation||null);

    res.status(201).json({ message: 'Account created. Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.' });
  }
});

module.exports = router;
