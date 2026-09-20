'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

// GET /api/admin/stats — also used by homepage (open for hero counts)
router.get('/stats', (req, res) => {
  const stats = db.prepare(`SELECT
    (SELECT COUNT(*) FROM products) AS products,
    (SELECT COUNT(*) FROM sellers WHERE status='VERIFIED') AS verifiedSellers,
    (SELECT COUNT(*) FROM sellers) AS totalSellers,
    (SELECT COUNT(*) FROM seller_listings WHERE status='ACTIVE') AS activeListings,
    (SELECT COUNT(*) FROM enquiries) AS enquiries,
    (SELECT COUNT(*) FROM categories) AS categories
  `).get();
  res.json({ stats });
});

// All routes below require admin
router.use(requireAdmin);

router.get('/sellers', (req, res) => {
  const sellers = db.prepare(`SELECT s.*, sl.city, sl.locality FROM sellers s
    LEFT JOIN seller_locations sl ON sl.seller_id=s.id AND sl.is_primary=1
    ORDER BY s.created_at DESC`).all();
  res.json({ sellers });
});

router.put('/sellers/:id/status', (req, res) => {
  const { status, verification_notes } = req.body || {};
  const valid = ['VERIFIED','REJECTED','SUSPENDED','PENDING_VERIFICATION'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  db.prepare("UPDATE sellers SET status=?, verification_notes=COALESCE(?,verification_notes), updated_at=datetime('now') WHERE id=?")
    .run(status, verification_notes||null, req.params.id);
  res.json({ ok: true });
});

router.get('/products', (req, res) => {
  const products = db.prepare(`SELECT p.*, c.name AS category_name FROM products p
    LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.created_at DESC`).all();
  res.json({ products });
});

router.get('/enquiries', (req, res) => {
  const enquiries = db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC').all();
  res.json({ enquiries });
});

module.exports = router;
