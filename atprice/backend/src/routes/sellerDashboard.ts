import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { pool, query, queryOne } from '../db/pool';

const router = Router();
router.use(requireAuth);
router.use(requireRole('SELLER', 'ADMIN'));

async function getSellerByUserId(userId: string) {
  return queryOne('SELECT * FROM sellers WHERE user_id=$1', [userId]);
}

// GET /api/v1/seller/dashboard
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const seller = await getSellerByUserId(req.user!.id) as Record<string, unknown> | null;
    if (!seller) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller profile not found.' } });

    const [listingStats, enquiryStats] = await Promise.all([
      queryOne(
        `SELECT COUNT(*) AS total_listings, COUNT(*) FILTER (WHERE availability='IN_STOCK') AS in_stock,
                COUNT(*) FILTER (WHERE availability='OUT_OF_STOCK') AS out_of_stock
         FROM seller_listings WHERE seller_id=$1 AND active=true`,
        [seller.id]
      ),
      queryOne(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='NEW') AS unread
         FROM enquiries WHERE seller_id=$1`,
        [seller.id]
      ),
    ]);

    res.json({
      success: true,
      data: { seller, listing_stats: listingStats, enquiry_stats: enquiryStats },
    });
  } catch (err) {
    console.error('Seller dashboard error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Dashboard unavailable.' } });
  }
});

// GET /api/v1/seller/listings
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const seller = await getSellerByUserId(req.user!.id) as Record<string, unknown> | null;
    if (!seller) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No seller profile.' } });

    const listings = await query(
      `SELECT sl.id, sl.price, sl.mrp, sl.availability, sl.stock_quantity, sl.minimum_order_qty,
              sl.pickup_available, sl.delivery_available, sl.active, sl.last_updated_at, sl.notes,
              p.id AS product_id, p.name AS product_name, p.brand, p.unit,
              c.name AS category_name, pi.image_url
       FROM seller_listings sl
       JOIN products p ON p.id=sl.product_id
       LEFT JOIN categories c ON c.id=p.category_id
       LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.is_primary=true
       WHERE sl.seller_id=$1
       ORDER BY sl.last_updated_at DESC`,
      [seller.id]
    );

    res.json({ success: true, data: { listings } });
  } catch (err) {
    console.error('Seller listings error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch listings.' } });
  }
});

// POST /api/v1/seller/listings — create new listing
router.post('/listings', async (req: Request, res: Response) => {
  try {
    const seller = await getSellerByUserId(req.user!.id) as Record<string, unknown> | null;
    if (!seller) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No seller profile.' } });
    if (seller.status !== 'VERIFIED') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Your shop must be verified to create listings.' } });

    const { product_id, price, mrp, availability, stock_quantity, minimum_order_qty, pickup_available, delivery_available, notes } = req.body;
    if (!product_id || !price) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'product_id and price are required.' } });
    }
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Price must be a non-negative number.' } });
    }

    const client = await pool.connect();
    try {
      const prodExists = await client.query('SELECT id FROM products WHERE id=$1 AND active=true', [product_id]);
      if (prodExists.rows.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } });

      const result = await client.query(
        `INSERT INTO seller_listings(seller_id, product_id, price, mrp, availability, stock_quantity, minimum_order_qty, pickup_available, delivery_available, notes, last_updated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
         ON CONFLICT(seller_id, product_id) DO UPDATE
           SET price=$3, mrp=$4, availability=$5, stock_quantity=$6, minimum_order_qty=$7,
               pickup_available=$8, delivery_available=$9, notes=$10, last_updated_at=now(), active=true
         RETURNING id`,
        [seller.id, product_id, parseFloat(price), mrp ? parseFloat(mrp) : null,
         availability || 'IN_STOCK', stock_quantity || 0, minimum_order_qty || 1,
         pickup_available !== false, delivery_available || false, notes || null]
      );

      res.status(201).json({ success: true, message: 'Listing created.', data: { listing_id: result.rows[0].id } });
    } finally { client.release(); }
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create listing.' } });
  }
});

// PATCH /api/v1/seller/listings/:id — update listing
router.patch('/listings/:id', async (req: Request, res: Response) => {
  try {
    const seller = await getSellerByUserId(req.user!.id) as Record<string, unknown> | null;
    if (!seller) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No seller profile.' } });

    // Verify ownership — NEVER trust seller_id from request body
    const existing = await queryOne(
      'SELECT id FROM seller_listings WHERE id=$1 AND seller_id=$2',
      [req.params.id, seller.id]
    );
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found.' } });

    const { price, mrp, availability, stock_quantity, minimum_order_qty, pickup_available, delivery_available, active, notes } = req.body;

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (price !== undefined) {
      if (isNaN(parseFloat(price)) || parseFloat(price) < 0) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid price.' } });
      updates.push(`price=$${idx++}`); params.push(parseFloat(price));
    }
    if (mrp !== undefined) { updates.push(`mrp=$${idx++}`); params.push(mrp ? parseFloat(mrp) : null); }
    if (availability !== undefined) {
      if (!['IN_STOCK','LOW_STOCK','OUT_OF_STOCK'].includes(availability)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid availability.' } });
      updates.push(`availability=$${idx++}`); params.push(availability);
    }
    if (stock_quantity !== undefined) { updates.push(`stock_quantity=$${idx++}`); params.push(parseInt(stock_quantity)); }
    if (minimum_order_qty !== undefined) { updates.push(`minimum_order_qty=$${idx++}`); params.push(parseInt(minimum_order_qty)); }
    if (pickup_available !== undefined) { updates.push(`pickup_available=$${idx++}`); params.push(pickup_available); }
    if (delivery_available !== undefined) { updates.push(`delivery_available=$${idx++}`); params.push(delivery_available); }
    if (active !== undefined) { updates.push(`active=$${idx++}`); params.push(active); }
    if (notes !== undefined) { updates.push(`notes=$${idx++}`); params.push(notes); }

    if (updates.length === 0) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No fields to update.' } });

    updates.push(`last_updated_at=now()`);
    params.push(req.params.id);

    await pool.query(`UPDATE seller_listings SET ${updates.join(',')} WHERE id=$${idx}`, params);

    res.json({ success: true, message: 'Listing updated.' });
  } catch (err) {
    console.error('Update listing error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update listing.' } });
  }
});

// DELETE /api/v1/seller/listings/:id
router.delete('/listings/:id', async (req: Request, res: Response) => {
  try {
    const seller = await getSellerByUserId(req.user!.id) as Record<string, unknown> | null;
    if (!seller) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No seller profile.' } });

    const result = await pool.query(
      'UPDATE seller_listings SET active=false WHERE id=$1 AND seller_id=$2 RETURNING id',
      [req.params.id, seller.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found.' } });

    res.json({ success: true, message: 'Listing deactivated.' });
  } catch (err) {
    console.error('Delete listing error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete listing.' } });
  }
});

// GET /api/v1/seller/enquiries
router.get('/enquiries', async (req: Request, res: Response) => {
  try {
    const seller = await getSellerByUserId(req.user!.id) as Record<string, unknown> | null;
    if (!seller) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No seller profile.' } });

    const enquiries = await query(
      `SELECT e.id, e.message, e.customer_name, e.customer_phone, e.status, e.created_at,
              u.name AS customer_account_name, u.email AS customer_email,
              p.name AS product_name, p.id AS product_id
       FROM enquiries e
       LEFT JOIN users u ON u.id=e.customer_id
       LEFT JOIN products p ON p.id=e.product_id
       WHERE e.seller_id=$1
       ORDER BY e.created_at DESC
       LIMIT 100`,
      [seller.id]
    );

    res.json({ success: true, data: { enquiries } });
  } catch (err) {
    console.error('Seller enquiries error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch enquiries.' } });
  }
});

// PATCH /api/v1/seller/profile
router.patch('/profile', async (req: Request, res: Response) => {
  try {
    const seller = await getSellerByUserId(req.user!.id) as Record<string, unknown> | null;
    if (!seller) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No seller profile.' } });

    const { description, phone, whatsapp, address, city, state, pincode, business_hours, service_area_km, pickup_available, delivery_available } = req.body;

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const safeUpdate = (field: string, val: unknown) => {
      if (val !== undefined) { updates.push(`${field}=$${idx++}`); params.push(val); }
    };

    safeUpdate('description', description);
    safeUpdate('phone', phone);
    safeUpdate('whatsapp', whatsapp);
    safeUpdate('address', address);
    safeUpdate('city', city);
    safeUpdate('state', state);
    safeUpdate('pincode', pincode);
    safeUpdate('business_hours', business_hours);
    safeUpdate('service_area_km', service_area_km ? parseFloat(service_area_km as string) : undefined);
    safeUpdate('pickup_available', pickup_available);
    safeUpdate('delivery_available', delivery_available);

    if (updates.length === 0) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No fields to update.' } });

    params.push(seller.id);
    await pool.query(`UPDATE sellers SET ${updates.join(',')} WHERE id=$${idx}`, params);

    res.json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile.' } });
  }
});

export default router;
