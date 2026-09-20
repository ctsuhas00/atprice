'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const categories = db.prepare('SELECT id,name,slug,icon,image_url FROM categories ORDER BY name').all();
  for (const c of categories) {
    c.subcategories = db.prepare('SELECT id,name FROM subcategories WHERE category_id=? ORDER BY name').all(c.id);
    c.product_count = db.prepare('SELECT COUNT(*) AS n FROM products WHERE category_id=?').get(c.id).n;
  }
  res.json({ categories });
});

module.exports = router;
