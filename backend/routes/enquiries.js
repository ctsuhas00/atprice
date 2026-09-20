'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');
const { randomUUID } = require('crypto');
const { requireSeller, requireAdmin } = require('../middleware/auth');

// POST /api/enquiries — create enquiry (no auth needed)
router.post('/', (req, res) => {
  const { product_id, seller_id, listing_id, customer_name, customer_phone, customer_message } = req.body || {};
  if (!seller_id || !customer_phone) return res.status(400).json({ error: 'seller_id and customer_phone required.' });
  const product = product_id ? db.prepare('SELECT name FROM products WHERE id=?').get(product_id) : null;
  const seller = db.prepare('SELECT shop_name FROM sellers WHERE id=?').get(seller_id);
  if (!seller) return res.status(404).json({ error: 'Seller not found.' });
  db.prepare(`INSERT INTO enquiries (id,product_id,seller_id,listing_id,customer_name,customer_phone,customer_message,product_name,seller_name)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(randomUUID(),product_id||null,seller_id,listing_id||null,customer_name||null,customer_phone,
         customer_message||null,product?.name||null,seller.shop_name);
  res.status(201).json({ ok: true });
});

// GET /api/enquiries — seller sees their own; admin sees all
router.get('/', requireSeller, (req, res) => {
  const isAdmin = req.user.role === 'ADMIN';
  const sid = req.user.sellerId;
  const enquiries = isAdmin
    ? db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 200').all()
    : db.prepare('SELECT * FROM enquiries WHERE seller_id=? ORDER BY created_at DESC').all(sid);
  res.json({ enquiries });
});

module.exports = router;
