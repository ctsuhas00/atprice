'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const { signToken } = require('../utils/auth');
const { requireAuth, requireSeller, requireAdmin } = require('../middleware/auth');
const { randomUUID } = require('crypto');

// GET /api/sellers — public seller list
router.get('/', (req, res) => {
  const city = req.query.city || '';
  const status = req.query.status || 'VERIFIED';
  const sellers = db.prepare(`
    SELECT s.id, s.shop_name, s.owner_name, s.status, s.rating, s.rating_count,
           s.description, s.phone, s.whatsapp, s.years_in_business,
           s.pickup_available, s.delivery_available, s.opening_hours,
           sl.city, sl.locality, sl.address1, sl.latitude, sl.longitude
    FROM sellers s
    LEFT JOIN seller_locations sl ON sl.seller_id=s.id AND sl.is_primary=1
    WHERE s.status=? ${city?"AND sl.city LIKE ?":""}
    ORDER BY s.rating DESC LIMIT 100
  `).all(...[status,...(city?[`%${city}%`]:[])]);
  res.json({ sellers });
});

// GET /api/sellers/:id — public seller profile
router.get('/:id', (req, res) => {
  const seller = db.prepare(`
    SELECT s.id, s.shop_name, s.owner_name, s.mobile, s.phone, s.whatsapp,
           s.email, s.gstin, s.seller_type, s.years_in_business,
           s.description, s.opening_hours, s.return_policy,
           s.status, s.rating, s.rating_count,
           s.pickup_available, s.delivery_available, s.delivery_radius_km,
           s.created_at, s.is_demo_data,
           sl.city, sl.locality, sl.address1, sl.pincode, sl.latitude, sl.longitude
    FROM sellers s
    LEFT JOIN seller_locations sl ON sl.seller_id=s.id AND sl.is_primary=1
    WHERE s.id=?
  `).get(req.params.id);
  if (!seller) return res.status(404).json({ error: 'Seller not found.' });
  // Products this seller lists
  const products = db.prepare(`
    SELECT p.id, p.name, p.brand, c.name AS category_name, pi.url AS image_url,
           sl.price, sl.availability, sl.stock_quantity, sl.updated_at
    FROM seller_listings sl
    JOIN products p ON p.id=sl.product_id
    LEFT JOIN categories c ON c.id=p.category_id
    LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.is_primary=1
    WHERE sl.seller_id=? AND sl.status='ACTIVE'
    ORDER BY sl.updated_at DESC LIMIT 30
  `).all(req.params.id);
  // Never expose: password_hash, bank_account_last4, ifsc, pan, verification_notes
  res.json({ seller, products });
});

// POST /api/sellers/register
router.post('/register', (req, res) => {
  const { owner_name, mobile, shop_name, email, password,
          gstin, years_in_business, description,
          address1, locality, city, district, state, pincode, latitude, longitude } = req.body || {};
  if (!owner_name||!mobile||!shop_name||!password)
    return res.status(400).json({ error: 'owner_name, mobile, shop_name, password are required.' });

  const hash = bcrypt.hashSync(password, 10);
  const uid = randomUUID(); const sid = randomUUID();
  const code = 'ATPS-' + Math.random().toString(36).slice(2,8).toUpperCase();

  try {
    db.prepare('INSERT INTO users (id,role,name,email,phone,password_hash) VALUES (?,?,?,?,?,?)')
      .run(uid, 'SELLER', owner_name, email||null, mobile, hash);
    db.prepare(`INSERT INTO sellers (id,seller_code,user_id,owner_name,mobile,email,shop_name,gstin,
      years_in_business,phone,whatsapp,description,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'PENDING_VERIFICATION')`)
      .run(sid,code,uid,owner_name,mobile,email||null,shop_name,gstin||null,
           years_in_business||null,mobile,mobile,description||null);
    if (city) {
      db.prepare(`INSERT INTO seller_locations (id,seller_id,address1,locality,city,district,state,pincode,latitude,longitude)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).run(randomUUID(),sid,address1||shop_name,locality||null,city,
        district||city,state||'Karnataka',pincode||'',latitude||null,longitude||null);
    }
    const token = signToken({ id: uid, role: 'SELLER', name: owner_name, sellerId: sid });
    res.status(201).json({ ok: true, token, seller_code: code, seller_id: sid });
  } catch(e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Mobile or email already registered.' });
    throw e;
  }
});

// GET /api/sellers/me/dashboard — seller dashboard data
router.get('/me/dashboard', requireSeller, (req, res) => {
  const sellerId = req.user.sellerId;
  if (!sellerId) return res.status(404).json({ error: 'Seller profile not found.' });
  const seller = db.prepare(`SELECT s.*, sl.city, sl.locality, sl.address1, sl.pincode, sl.latitude, sl.longitude
    FROM sellers s LEFT JOIN seller_locations sl ON sl.seller_id=s.id AND sl.is_primary=1
    WHERE s.id=?`).get(sellerId);
  const listings = db.prepare(`
    SELECT sl.*, p.name AS product_name, p.brand, c.name AS category_name, pi.url AS image_url
    FROM seller_listings sl
    JOIN products p ON p.id=sl.product_id
    LEFT JOIN categories c ON c.id=p.category_id
    LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.is_primary=1
    WHERE sl.seller_id=? ORDER BY sl.updated_at DESC
  `).all(sellerId);
  const enquiries = db.prepare('SELECT * FROM enquiries WHERE seller_id=? ORDER BY created_at DESC LIMIT 20').all(sellerId);
  res.json({ seller, listings, enquiries });
});

// PUT /api/sellers/me — update seller profile
router.put('/me', requireSeller, (req, res) => {
  const sid = req.user.sellerId;
  const { shop_name, description, opening_hours, phone, whatsapp, return_policy,
          delivery_available, pickup_available, delivery_radius_km,
          address1, locality, city, district, state, pincode, latitude, longitude } = req.body || {};
  db.prepare(`UPDATE sellers SET shop_name=COALESCE(?,shop_name), description=COALESCE(?,description),
    opening_hours=COALESCE(?,opening_hours), phone=COALESCE(?,phone), whatsapp=COALESCE(?,whatsapp),
    return_policy=COALESCE(?,return_policy),
    delivery_available=COALESCE(?,delivery_available), pickup_available=COALESCE(?,pickup_available),
    delivery_radius_km=COALESCE(?,delivery_radius_km), updated_at=datetime('now') WHERE id=?`)
    .run(shop_name||null,description||null,opening_hours||null,phone||null,whatsapp||null,
         return_policy||null,delivery_available??null,pickup_available??null,delivery_radius_km||null,sid);
  // Update location
  if (city || latitude) {
    const existing = db.prepare('SELECT id FROM seller_locations WHERE seller_id=? AND is_primary=1').get(sid);
    if (existing) {
      db.prepare(`UPDATE seller_locations SET address1=COALESCE(?,address1), locality=COALESCE(?,locality),
        city=COALESCE(?,city), district=COALESCE(?,district), state=COALESCE(?,state),
        pincode=COALESCE(?,pincode), latitude=COALESCE(?,latitude), longitude=COALESCE(?,longitude)
        WHERE id=?`).run(address1||null,locality||null,city||null,district||null,
          state||null,pincode||null,latitude||null,longitude||null,existing.id);
    }
  }
  res.json({ ok: true });
});

// POST /api/sellers/me/listings — add listing
router.post('/me/listings', requireSeller, (req, res) => {
  const sid = req.user.sellerId;
  const { product_id, price, mrp, stock_quantity, availability, delivery_available, pickup_available, minimum_order_qty, notes } = req.body || {};
  if (!product_id || price == null) return res.status(400).json({ error: 'product_id and price required.' });
  const product = db.prepare('SELECT id, unit FROM products WHERE id=?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  const q = stock_quantity ?? 0;
  const av = availability || (q===0?'OUT_OF_STOCK':q<=5?'LOW_STOCK':'IN_STOCK');
  try {
    const id = randomUUID();
    db.prepare(`INSERT INTO seller_listings (id,seller_id,product_id,price,mrp,stock_quantity,
      minimum_order_qty,unit,availability,delivery_available,pickup_available,status,source,notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,'ACTIVE','MANUAL',?)`)
      .run(id,sid,product_id,price,mrp||null,q,minimum_order_qty||1,product.unit,av,
           delivery_available?1:0,pickup_available??1,notes||null);
    res.status(201).json({ ok: true, id });
  } catch(e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Listing already exists for this product. Update it instead.' });
    throw e;
  }
});

// PUT /api/sellers/me/listings/:lid — update listing
router.put('/me/listings/:lid', requireSeller, (req, res) => {
  const sid = req.user.sellerId;
  const listing = db.prepare('SELECT * FROM seller_listings WHERE id=? AND seller_id=?').get(req.params.lid, sid);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  const { price, mrp, stock_quantity, availability, delivery_available, pickup_available, minimum_order_qty, status, notes } = req.body || {};
  const q = stock_quantity ?? listing.stock_quantity;
  const av = availability || (q===0?'OUT_OF_STOCK':q<=5?'LOW_STOCK':'IN_STOCK');
  db.prepare(`UPDATE seller_listings SET price=COALESCE(?,price), mrp=COALESCE(?,mrp),
    stock_quantity=?, availability=?, delivery_available=COALESCE(?,delivery_available),
    pickup_available=COALESCE(?,pickup_available), minimum_order_qty=COALESCE(?,minimum_order_qty),
    status=COALESCE(?,status), notes=COALESCE(?,notes), updated_at=datetime('now')
    WHERE id=?`)
    .run(price||null,mrp||null,q,av,delivery_available??null,pickup_available??null,
         minimum_order_qty||null,status||null,notes||null,req.params.lid);
  res.json({ ok: true });
});

// DELETE /api/sellers/me/listings/:lid
router.delete('/me/listings/:lid', requireSeller, (req, res) => {
  db.prepare("UPDATE seller_listings SET status='DISABLED' WHERE id=? AND seller_id=?")
    .run(req.params.lid, req.user.sellerId);
  res.json({ ok: true });
});

module.exports = router;
