'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');
const { haversineKm } = require('../utils/geo');

// GET /api/products?q=&category=&brand=&page=&limit=&sort=
router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  const category = req.query.category || '';
  const brand = req.query.brand || '';
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  let products, total;

  if (q) {
    // FTS5 search with fallback to LIKE
    const ftsQuery = q.split(/\s+/).filter(Boolean).map(w => `"${w.replace(/"/g,'')}"*`).join(' ');
    try {
      const ftsResults = db.prepare(`
        SELECT p.id, p.name, p.brand, p.category_id, p.unit, p.mrp, p.specifications,
               p.description, p.manufacturer, p.warranty, p.pack_size, p.is_demo_data,
               c.name AS category_name,
               pi.url AS image_url,
               (SELECT MIN(sl.price) FROM seller_listings sl WHERE sl.product_id=p.id AND sl.status='ACTIVE') AS lowest_price,
               (SELECT COUNT(*) FROM seller_listings sl WHERE sl.product_id=p.id AND sl.status='ACTIVE') AS seller_count,
               rank AS fts_rank
        FROM products_fts
        JOIN products p ON products_fts.rowid = p.rowid
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary=1
        WHERE products_fts MATCH ?
        ${category ? "AND c.name=?" : ""}
        ${brand ? "AND p.brand LIKE ?" : ""}
        ORDER BY rank
        LIMIT ? OFFSET ?
      `).all(...[ftsQuery, ...(category?[category]:[]), ...(brand?[`%${brand}%`]:[]), limit, offset]);

      const totalRow = db.prepare(`
        SELECT COUNT(*) AS c FROM products_fts
        JOIN products p ON products_fts.rowid = p.rowid
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE products_fts MATCH ?
        ${category ? "AND c.name=?" : ""}
        ${brand ? "AND p.brand LIKE ?" : ""}
      `).get(...[ftsQuery, ...(category?[category]:[]), ...(brand?[`%${brand}%`]:[])]);
      total = totalRow.c;
      products = ftsResults;
    } catch {
      // FTS fallback to LIKE
      const like = `%${q}%`;
      products = db.prepare(`
        SELECT p.id, p.name, p.brand, p.category_id, p.unit, p.mrp, p.specifications,
               p.description, p.manufacturer, p.warranty, p.pack_size, p.is_demo_data,
               c.name AS category_name,
               pi.url AS image_url,
               (SELECT MIN(sl.price) FROM seller_listings sl WHERE sl.product_id=p.id AND sl.status='ACTIVE') AS lowest_price,
               (SELECT COUNT(*) FROM seller_listings sl WHERE sl.product_id=p.id AND sl.status='ACTIVE') AS seller_count
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.is_primary=1
        WHERE (p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ? OR p.keywords LIKE ? OR p.model LIKE ? OR p.sku LIKE ?)
        ${category ? "AND c.name=?" : ""}
        ${brand ? "AND p.brand LIKE ?" : ""}
        ORDER BY p.name LIMIT ? OFFSET ?
      `).all(...[like,like,like,like,like,like,...(category?[category]:[]),...(brand?[`%${brand}%`]:[]),limit,offset]);
      const tr = db.prepare(`SELECT COUNT(*) AS c FROM products p LEFT JOIN categories c ON c.id=p.category_id
        WHERE (p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ? OR p.keywords LIKE ? OR p.model LIKE ? OR p.sku LIKE ?)
        ${category?"AND c.name=?":""} ${brand?"AND p.brand LIKE ?":""}`
      ).get(...[like,like,like,like,like,like,...(category?[category]:[]),...(brand?[`%${brand}%`]:[])]);
      total = tr.c;
    }
  } else {
    // Browse all
    products = db.prepare(`
      SELECT p.id, p.name, p.brand, p.category_id, p.unit, p.mrp, p.specifications,
             p.description, p.manufacturer, p.warranty, p.pack_size, p.is_demo_data,
             c.name AS category_name,
             pi.url AS image_url,
             (SELECT MIN(sl.price) FROM seller_listings sl WHERE sl.product_id=p.id AND sl.status='ACTIVE') AS lowest_price,
             (SELECT COUNT(*) FROM seller_listings sl WHERE sl.product_id=p.id AND sl.status='ACTIVE') AS seller_count
      FROM products p
      LEFT JOIN categories c ON c.id=p.category_id
      LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.is_primary=1
      ${category ? "WHERE c.name=?" : ""}
      ${brand ? (category?"AND":"WHERE")+" p.brand LIKE ?" : ""}
      ORDER BY p.name LIMIT ? OFFSET ?
    `).all(...(category?[category]:[]),...(brand?[`%${brand}%`]:[]),limit,offset);
    const tr = db.prepare(`SELECT COUNT(*) AS c FROM products p LEFT JOIN categories c ON c.id=p.category_id
      ${category?"WHERE c.name=?":""} ${brand?(category?"AND":"WHERE")+" p.brand LIKE ?":""}`
    ).get(...(category?[category]:[]),...(brand?[`%${brand}%`]:[]));
    total = tr.c;
  }

  res.json({ products, total, page, limit, pages: Math.ceil(total / limit) });
});

// GET /api/products/suggest?q=
router.get('/suggest', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ suggestions: [] });
  const ftsQuery = q.split(/\s+/).filter(Boolean).map(w => `"${w.replace(/"/g,'')}"*`).join(' ');
  let results;
  try {
    results = db.prepare(`
      SELECT DISTINCT p.id, p.name, p.brand, c.name AS category_name, pi.url AS image_url
      FROM products_fts
      JOIN products p ON products_fts.rowid=p.rowid
      LEFT JOIN categories c ON c.id=p.category_id
      LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.is_primary=1
      WHERE products_fts MATCH ?
      ORDER BY rank LIMIT 8
    `).all(ftsQuery);
  } catch {
    const like = `%${q}%`;
    results = db.prepare(`
      SELECT p.id, p.name, p.brand, c.name AS category_name, pi.url AS image_url
      FROM products p LEFT JOIN categories c ON c.id=p.category_id
      LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.is_primary=1
      WHERE p.name LIKE ? OR p.brand LIKE ? LIMIT 8
    `).all(like, like);
  }
  res.json({ suggestions: results });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug,
           sc.name AS subcategory_name
    FROM products p
    LEFT JOIN categories c ON c.id=p.category_id
    LEFT JOIN subcategories sc ON sc.id=p.subcategory_id
    WHERE p.id=?
  `).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  const images = db.prepare('SELECT url, is_primary FROM product_images WHERE product_id=? ORDER BY is_primary DESC, sort_order ASC').all(product.id);
  try { product.specifications = JSON.parse(product.specifications || '{}'); } catch { product.specifications = {}; }
  res.json({ product, images });
});

// GET /api/products/:id/compare?lat=&lng=&sort=price_asc|price_desc|nearest|farthest|rated|updated|best_value
router.get('/:id/compare', (req, res) => {
  const { lat, lng, sort } = req.query;
  const userLat = parseFloat(lat) || null;
  const userLng = parseFloat(lng) || null;

  const listings = db.prepare(`
    SELECT sl.id, sl.price, sl.mrp, sl.stock_quantity, sl.availability,
           sl.delivery_available, sl.pickup_available, sl.minimum_order_qty,
           sl.unit, sl.updated_at, sl.notes,
           s.id AS seller_id, s.shop_name, s.status AS seller_status,
           s.rating, s.rating_count, s.phone, s.whatsapp,
           s.description AS seller_desc, s.opening_hours,
           sl2.city, sl2.locality, sl2.address1, sl2.latitude, sl2.longitude
    FROM seller_listings sl
    JOIN sellers s ON s.id=sl.seller_id
    LEFT JOIN seller_locations sl2 ON sl2.seller_id=s.id AND sl2.is_primary=1
    WHERE sl.product_id=? AND sl.status='ACTIVE'
  `).all(req.params.id);

  // Compute distance
  for (const l of listings) {
    l.distance_km = haversineKm(userLat, userLng, l.latitude, l.longitude);
    l.is_verified = l.seller_status === 'VERIFIED';
    // Updated time label
    const diffMin = Math.floor((Date.now() - new Date(l.updated_at)) / 60000);
    if (diffMin < 60) l.updated_label = `${diffMin} min ago`;
    else if (diffMin < 1440) l.updated_label = `${Math.floor(diffMin/60)} hr ago`;
    else l.updated_label = `${Math.floor(diffMin/1440)}d ago`;
    // Best value score (lower = better): price_norm + dist_norm - rating_norm
    l._bv_price = l.price;
    l._bv_dist = l.distance_km ?? 9999;
    l._bv_rating = l.rating || 0;
  }

  // Sorting
  const s = sort || 'price_asc';
  if (s === 'price_asc') listings.sort((a,b) => a.price - b.price);
  else if (s === 'price_desc') listings.sort((a,b) => b.price - a.price);
  else if (s === 'nearest') listings.sort((a,b) => (a.distance_km??9999)-(b.distance_km??9999));
  else if (s === 'farthest') listings.sort((a,b) => (b.distance_km??-1)-(a.distance_km??-1));
  else if (s === 'rated') listings.sort((a,b) => b.rating-a.rating);
  else if (s === 'updated') listings.sort((a,b) => new Date(b.updated_at)-new Date(a.updated_at));
  else if (s === 'best_value') {
    const maxP = Math.max(...listings.map(l=>l._bv_price),1);
    const maxD = Math.max(...listings.map(l=>l._bv_dist).filter(d=>d<9999),1);
    listings.sort((a,b) => {
      const sa = (a._bv_price/maxP)*0.6 + (a._bv_dist/maxD)*0.25 - (a._bv_rating/5)*0.15;
      const sb = (b._bv_price/maxP)*0.6 + (b._bv_dist/maxD)*0.25 - (b._bv_rating/5)*0.15;
      return sa-sb;
    });
  }

  res.json({ listings, sort: s });
});

module.exports = router;
