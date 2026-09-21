import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db/pool';

const router = Router();

// GET /api/v1/sellers/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const seller = await queryOne(
      `SELECT
         s.id, s.shop_name, s.owner_name, s.phone, s.whatsapp, s.email,
         s.description, s.status, s.address, s.city, s.state, s.pincode,
         s.rating, s.rating_count, s.business_hours, s.service_area_km,
         s.pickup_available, s.delivery_available, s.is_demo_data, s.created_at
       FROM sellers s
       WHERE s.id = $1 AND s.status = 'VERIFIED'`,
      [req.params.id]
    );

    if (!seller) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller not found.' } });
    }

    // Get seller's listings
    const listings = await query(
      `SELECT
         sl.id, sl.price, sl.availability, sl.pickup_available, sl.delivery_available,
         sl.last_updated_at, sl.minimum_order_qty, sl.stock_quantity,
         p.id AS product_id, p.name AS product_name, p.brand, p.unit, p.mrp,
         c.name AS category_name, c.slug AS category_slug,
         pi.image_url
       FROM seller_listings sl
       JOIN products p ON p.id = sl.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
       WHERE sl.seller_id = $1 AND sl.active = true AND p.active = true
       ORDER BY c.name, p.name
       LIMIT 50`,
      [req.params.id]
    );

    res.json({ success: true, data: { seller, listings } });
  } catch (err) {
    console.error('Seller detail error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch seller.' } });
  }
});

// GET /api/v1/sellers?city=&page=&limit=
router.get('/', async (req: Request, res: Response) => {
  try {
    const city = (req.query.city as string || '').trim();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const params: unknown[] = [];
    let where = "WHERE s.status='VERIFIED'";
    if (city) { where += ' AND s.city ILIKE $1'; params.push(`%${city}%`); }
    params.push(limit, offset);

    const sellers = await query(
      `SELECT s.id, s.shop_name, s.owner_name, s.city, s.state, s.rating, s.rating_count,
              s.pickup_available, s.delivery_available, s.business_hours,
              COUNT(DISTINCT sl.id) AS listing_count
       FROM sellers s
       LEFT JOIN seller_listings sl ON sl.seller_id=s.id AND sl.active=true
       ${where}
       GROUP BY s.id
       ORDER BY s.rating DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countRes = await query(
      `SELECT COUNT(*) AS total FROM sellers s ${where}`,
      city ? [params[0]] : []
    );
    const total = parseInt((countRes[0] as { total: string }).total, 10);

    res.json({ success: true, data: { sellers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (err) {
    console.error('Sellers list error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch sellers.' } });
  }
});

export default router;
