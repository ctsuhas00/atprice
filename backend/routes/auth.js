'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const { signToken } = require('../utils/auth');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { phone, email, password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Password required.' });
  const identifier = phone || email;
  if (!identifier) return res.status(400).json({ error: 'Phone or email required.' });

  const user = phone
    ? db.prepare('SELECT * FROM users WHERE phone=?').get(phone)
    : db.prepare('SELECT * FROM users WHERE email=?').get(email);

  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
  if (!bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid credentials.' });

  let seller = null;
  if (user.role === 'SELLER') {
    seller = db.prepare(`
      SELECT s.*, sl.latitude, sl.longitude, sl.city, sl.locality, sl.address1
      FROM sellers s LEFT JOIN seller_locations sl ON sl.seller_id=s.id AND sl.is_primary=1
      WHERE s.user_id=?`).get(user.id);
  }

  const token = signToken({ id: user.id, role: user.role, name: user.name, sellerId: seller?.id });
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email, phone: user.phone }, seller });
});

// POST /api/auth/register (customer)
router.post('/register', (req, res) => {
  const { name, phone, email, password } = req.body || {};
  if (!name || !password) return res.status(400).json({ error: 'Name and password required.' });
  if (!phone && !email) return res.status(400).json({ error: 'Phone or email required.' });
  const hash = bcrypt.hashSync(password, 10);
  const { randomUUID } = require('crypto');
  try {
    db.prepare('INSERT INTO users (id,role,name,email,phone,password_hash) VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), 'CUSTOMER', name, email||null, phone||null, hash);
    res.json({ ok: true });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Phone or email already registered.' });
    throw e;
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id,name,role,email,phone FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  let seller = null;
  if (user.role === 'SELLER') {
    seller = db.prepare(`
      SELECT s.*, sl.latitude, sl.longitude, sl.city, sl.locality, sl.address1, sl.pincode
      FROM sellers s LEFT JOIN seller_locations sl ON sl.seller_id=s.id AND sl.is_primary=1
      WHERE s.user_id=?`).get(user.id);
  }
  res.json({ user, seller });
});

module.exports = router;
