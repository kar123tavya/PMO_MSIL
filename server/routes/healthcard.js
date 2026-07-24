'use strict';

const express = require('express');
const router  = express.Router();
const { db, uuidv4 } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

// Get health card for a division and month
router.get('/:division/:month', authMiddleware, (req, res) => {
  try {
    const { division, month } = req.params;
    let card = db.prepare('SELECT * FROM health_cards WHERE division=? AND month_year=?').get(division, month);
    
    if (card) {
      card.data = JSON.parse(card.data_json);
    } else {
      card = { division, month_year: month, data: {} };
    }
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update health card for a division and month
router.put('/:division/:month', authMiddleware, (req, res) => {
  try {
    const { division, month } = req.params;
    const { data } = req.body; // Expects JSON object for editable fields
    
    // Check access
    const { role, division: userDiv } = req.user;
    if (role === 'viewer') {
      return res.status(403).json({ error: 'Viewers cannot edit health cards' });
    }
    if (role !== 'admin' && userDiv !== division) {
      return res.status(403).json({ error: 'You can only edit health cards for your own division' });
    }

    const existing = db.prepare('SELECT id FROM health_cards WHERE division=? AND month_year=?').get(division, month);
    const now = new Date().toISOString();

    if (existing) {
      db.prepare('UPDATE health_cards SET data_json=?, updated_by=?, updated_by_name=?, updated_at=? WHERE id=?')
        .run(JSON.stringify(data), req.user.uid, req.user.name, now, existing.id);
    } else {
      db.prepare('INSERT INTO health_cards (id, division, month_year, data_json, updated_by, updated_by_name, updated_at) VALUES (?,?,?,?,?,?,?)')
        .run(uuidv4(), division, month, JSON.stringify(data), req.user.uid, req.user.name, now);
    }
    
    res.json({ success: true, message: 'Saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router };
