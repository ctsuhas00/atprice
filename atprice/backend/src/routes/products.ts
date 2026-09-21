import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db/pool';

const router = Router();

function haversineKm(lat1: number | null, lng1: number | null, lat2: number | null, lng2: number | null): number | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function relativeTime(date: string | Date): string {
  const diffMin = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)} hr ago`;
  if (diffMin < 43200) return `${Math.floor(diffMin / 1440)}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// GET /api/v1/products?q=&category=&brand=&page=&limit=
router.get('/', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    const category = (req.query.category as string || '').trim();
    const brand = (req.query.brand as string || '').trim();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.active = true';
    const params: unknown[] = [];
    let paramIdx = 1;

    if (q) {
      const tsQuery = q.trim().split(/\s+/).filter(Boolean).map(w => w + ':*').join(' & ');
      whereClause += ` AND (
        p.search_vector @@ to_tsquery('english', $${paramIdx})
        OR p.name ILIKE $${paramIdx + 1}
        OR p.brand ILIKE $${paramIdx + 1}
        OR p.keywords ILIKE $${paramIdx + 1}
        OR similarity(p.name, $${paramIdx + 2}) > 0.15
      )`;
      params.push(tsQuery, `%${q}%`, q);
      paramIdx += 3;
    }

    if (category) {
      whereClause += ` AND c.slug = $${paramIdx}`;
      params.push(category);
      paramIdx++;
    }

    if (brand) {
      whereClause += ` AND p.brand ILIKE $${paramIdx}`;
      params.push(`%${brand}%`);
      paramIdx++;
    }

    const orderBy = q
      ? `ORDER BY ts_rank(p.search_vector, to_tsquery('english', $1)) DESC, min_price ASC NULLS LAST`
      : 'ORDER BY p.name ASC';

    const sql = `
      SELECT
        p.id, p.name, p.brand, p.unit, p.mrp, p.is_demo_data,
        c.name AS category_name, c.slug AS category_slug,
        sc.name AS subcategory_name,
        pi.image_url,
        MIN(sl.price) AS min_price,
        COUNT(DISTINCT sl.id) FILTER (WHERE sl.active = true) AS seller_count
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN subcategories sc ON sc.id = p.subcategory_id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      LEFT JOIN seller_listings sl ON sl.product_id = p.id AND sl.active = true
      ${whereClause}
      GROUP BY p.id, c.name, c.slug, sc.name, pi.image_url
      ${orderBy}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    params.push(limit, offset);

    const countSql = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereClause}
    `;

    const [products, countRows] = await Promise.all([
      query(sql, params),
      query(countSql, q ? params.slice(0, paramIdx - 1) : params.slice(0, paramIdx - 1))
    ]);

    const total = parseInt((countRows[0] as { total: string }).total, 10);

    res.json({
      success: true,
      data: {
        products,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        query: q || null,
      },
    });
  } catch (err) {
    console.error('Products list error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch products.' } });
  }
});

// GET /api/v1/products/suggest?q=
router.get('/suggest', async (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim();
  if (!q || q.length < 2) return res.json({ success: true, data: { suggestions: [] } });

  try {
    const tsQuery = q.trim().split(/\s+/).filter(Boolean).map(w => w + ':*').join(' & ');
    const suggestions = await query(
      `SELECT DISTINCT p.id, p.name, p.brand, c.name AS category_name, pi.image_url
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
       WHERE p.active = true AND (
         p.search_vector @@ to_tsquery('english', $1)
         OR p.name ILIKE $2
         OR p.brand ILIKE $2
       )
       ORDER BY ts_rank(p.search_vector, to_tsquery('english', $1)) DESC
       LIMIT 8`,
      [tsQuery, `%${q}%`]
    );
    res.json({ success: true, data: { suggestions } });
  } catch {
    // Fallback
    try {
      const suggestions = await query(
        `SELECT p.id, p.name, p.brand, c.name AS category_name, pi.image_url
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
         WHERE p.active = true AND (p.name ILIKE $1 OR p.brand ILIKE $1)
         LIMIT 8`,
        [`%${q}%`]
      );
      res.json({ success: true, data: { suggestions } });
    } catch (err2) {
      console.error('Suggest error:', err2);
      res.json({ success: true, data: { suggestions: [] } });
    }
  }
});

// GET /api/v1/products/popular
router.get('/popular', async (_req: Request, res: Response) => {
  try {
    const products = await query(
      `SELECT p.id, p.name, p.brand, p.unit, p.mrp, p.is_demo_data,
              c.name AS category_name, c.slug AS category_slug,
              pi.image_url,
              MIN(sl.price) AS min_price,
              COUNT(DISTINCT sl.id) AS seller_count
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
       LEFT JOIN seller_listings sl ON sl.product_id = p.id AND sl.active = true
       WHERE p.active = true
       GROUP BY p.id, c.name, c.slug, pi.image_url
       HAVING COUNT(DISTINCT sl.id) > 0
       ORDER BY COUNT(DISTINCT sl.id) DESC, p.name
       LIMIT 12`
    );
    res.json({ success: true, data: { products } });
  } catch (err) {
    console.error('Popular products error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch popular products.' } });
  }
});

// GET /api/v1/products/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await queryOne(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug, sc.name AS subcategory_name,
              COUNT(DISTINCT sl.id) FILTER (WHERE sl.active=true) AS seller_count,
              MIN(sl.price) FILTER (WHERE sl.active=true) AS min_price
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN subcategories sc ON sc.id = p.subcategory_id
       LEFT JOIN seller_listings sl ON sl.product_id = p.id
       WHERE p.id = $1 AND p.active = true
       GROUP BY p.id, c.name, c.slug, sc.name`,
      [req.params.id]
    );

    if (!product) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } });
    }

    const images = await query(
      'SELECT id, image_url, alt_text, is_primary, sort_order FROM product_images WHERE product_id=$1 ORDER BY is_primary DESC, sort_order ASC',
      [req.params.id]
    );

    const p = product as Record<string, unknown>;
    try { p.specifications = JSON.parse(p.specifications as string || '{}'); } catch { p.specifications = {}; }

    res.json({ success: true, data: { product: p, images } });
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch product.' } });
  }
});

// GET /api/v1/products/:id/compare?lat=&lng=&sort=price_asc|price_desc|nearest|farthest|rated|updated|best_value
router.get('/:id/compare', async (req: Request, res: Response) => {
  const userLat = parseFloat(req.query.lat as string) || null;
  const userLng = parseFloat(req.query.lng as string) || null;
  const sort = (req.query.sort as string) || 'price_asc';

  try {
    const listings = await query(
      `SELECT
         sl.id, sl.price, sl.mrp, sl.stock_quantity, sl.availability,
         sl.delivery_available, sl.pickup_available, sl.minimum_order_qty, sl.notes,
         sl.last_updated_at, sl.updated_at,
         s.id AS seller_id, s.shop_name, s.status AS seller_status,
         s.rating, s.rating_count, s.phone, s.whatsapp,
         s.description AS seller_description, s.business_hours,
         s.city, s.address, s.latitude, s.longitude, s.pickup_available AS seller_pickup
       FROM seller_listings sl
       JOIN sellers s ON s.id = sl.seller_id
       WHERE sl.product_id = $1 AND sl.active = true AND s.status = 'VERIFIED'
       ORDER BY sl.price ASC`,
      [req.params.id]
    ) as Array<Record<string, unknown>>;

    // Compute distance, flags, labels
    for (const l of listings) {
      l.distance_km = haversineKm(userLat, userLng, l.latitude as number, l.longitude as number);
      l.is_verified = l.seller_status === 'VERIFIED';
      l.updated_label = relativeTime(l.last_updated_at as string);
    }

    // Sort
    const sorted = [...listings];
    switch (sort) {
      case 'price_asc': sorted.sort((a, b) => (a.price as number) - (b.price as number)); break;
      case 'price_desc': sorted.sort((a, b) => (b.price as number) - (a.price as number)); break;
      case 'nearest': sorted.sort((a, b) => ((a.distance_km as number) ?? 9999) - ((b.distance_km as number) ?? 9999)); break;
      case 'farthest': sorted.sort((a, b) => ((b.distance_km as number) ?? -1) - ((a.distance_km as number) ?? -1)); break;
      case 'rated': sorted.sort((a, b) => (b.rating as number) - (a.rating as number)); break;
      case 'updated': sorted.sort((a, b) => new Date(b.last_updated_at as string).getTime() - new Date(a.last_updated_at as string).getTime()); break;
      case 'best_value': {
        const prices = sorted.map(l => l.price as number);
        const dists = sorted.map(l => (l.distance_km as number) ?? 9999);
        const minP = Math.min(...prices), maxP = Math.max(...prices);
        const minD = Math.min(...dists), maxD = Math.max(...dists);
        const norm = (v: number, min: number, max: number) => max === min ? 1 : 1 - (v - min) / (max - min);
        for (const l of sorted) {
          const priceScore = norm(l.price as number, minP, maxP);
          const distScore = norm((l.distance_km as number) ?? maxD, minD, maxD);
          const ratingScore = ((l.rating as number) || 0) / 5;
          const stockScore = l.availability === 'IN_STOCK' ? 1 : l.availability === 'LOW_STOCK' ? 0.5 : 0;
          const deliveryScore = l.delivery_available ? 0.1 : 0;
          l._best_value_score = priceScore * 0.35 + distScore * 0.25 + ratingScore * 0.2 + stockScore * 0.1 + deliveryScore * 0.1;
        }
        sorted.sort((a, b) => (b._best_value_score as number) - (a._best_value_score as number));
        break;
      }
    }

    // Remove internal coordinates from response
    for (const l of sorted) {
      delete l.latitude; delete l.longitude;
      delete l._best_value_score;
    }

    res.json({ success: true, data: { listings: sorted, sort, user_location_set: userLat !== null } });
  } catch (err) {
    console.error('Compare error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch seller comparison.' } });
  }
});

export default router;
