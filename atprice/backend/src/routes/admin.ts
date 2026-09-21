import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { pool, query, queryOne } from '../db/pool';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

// GET /api/v1/admin/stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [users, sellers, products, listings, enquiries] = await Promise.all([
      queryOne('SELECT COUNT(*) AS total FROM users'),
      queryOne(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='PENDING') AS pending, COUNT(*) FILTER (WHERE status='VERIFIED') AS verified FROM sellers`),
      queryOne('SELECT COUNT(*) AS total FROM products WHERE active=true'),
      queryOne('SELECT COUNT(*) AS total FROM seller_listings WHERE active=true'),
      queryOne(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='NEW') AS new_count FROM enquiries`),
    ]);

    res.json({
      success: true,
      data: { users, sellers, products, listings, enquiries },
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats.' } });
  }
});

// GET /api/v1/admin/users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 25);
    const offset = (page - 1) * limit;
    const users = await query(
      `SELECT id, email, name, avatar_url, role, created_at, last_login_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = parseInt(((await queryOne('SELECT COUNT(*) AS c FROM users')) as Record<string, string> | null)?.c || '0', 10);
    res.json({ success: true, data: { users, pagination: { page, limit, total } } });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users.' } });
  }
});

// GET /api/v1/admin/sellers
router.get('/sellers', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 25);
    const offset = (page - 1) * limit;
    const params: unknown[] = [limit, offset];
    const where = status ? `WHERE s.status='${['PENDING','VERIFIED','REJECTED','SUSPENDED'].includes(status) ? status : 'PENDING'}'` : '';

    const sellers = await query(
      `SELECT s.id, s.shop_name, s.owner_name, s.phone, s.city, s.status, s.rating,
              s.is_demo_data, s.created_at, u.email AS user_email
       FROM sellers s LEFT JOIN users u ON u.id=s.user_id
       ${where}
       ORDER BY s.created_at DESC LIMIT $1 OFFSET $2`,
      params
    );
    res.json({ success: true, data: { sellers } });
  } catch (err) {
    console.error('Admin sellers error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch sellers.' } });
  }
});

// PATCH /api/v1/admin/sellers/:id/status — verify/reject/suspend
router.patch('/sellers/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['VERIFIED','REJECTED','SUSPENDED','PENDING'].includes(status)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status.' } });
  }

  try {
    const seller = await queryOne('SELECT id, user_id FROM sellers WHERE id=$1', [req.params.id]) as Record<string, string> | null;
    if (!seller) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller not found.' } });

    await pool.query('UPDATE sellers SET status=$1 WHERE id=$2', [status, req.params.id]);

    // Update user role when verifying
    if (status === 'VERIFIED' && seller.user_id) {
      await pool.query("UPDATE users SET role='SELLER' WHERE id=$1 AND role='CUSTOMER'", [seller.user_id]);
    }
    if ((status === 'REJECTED' || status === 'SUSPENDED') && seller.user_id) {
      await pool.query("UPDATE users SET role='CUSTOMER' WHERE id=$1 AND role='SELLER'", [seller.user_id]);
    }

    res.json({ success: true, message: `Seller status updated to ${status}.` });
  } catch (err) {
    console.error('Admin seller status error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update seller status.' } });
  }
});

// GET /api/v1/admin/products
router.get('/products', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 25);
    const offset = (page - 1) * limit;
    const products = await query(
      `SELECT p.id, p.name, p.brand, p.active, p.is_demo_data, p.mrp, p.created_at,
              c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id=p.category_id
       ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = parseInt(((await queryOne('SELECT COUNT(*) AS c FROM products')) as Record<string, string> | null)?.c || '0', 10);
    res.json({ success: true, data: { products, pagination: { page, limit, total } } });
  } catch (err) {
    console.error('Admin products error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch products.' } });
  }
});

// GET /api/v1/admin/listings
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 25);
    const offset = (page - 1) * limit;
    const listings = await query(
      `SELECT sl.id, sl.price, sl.availability, sl.active, sl.last_updated_at,
              s.shop_name, s.city, p.name AS product_name
       FROM seller_listings sl JOIN sellers s ON s.id=sl.seller_id JOIN products p ON p.id=sl.product_id
       ORDER BY sl.last_updated_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ success: true, data: { listings } });
  } catch (err) {
    console.error('Admin listings error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch listings.' } });
  }
});

// GET /api/v1/admin/enquiries
router.get('/enquiries', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 25);
    const offset = (page - 1) * limit;
    const enquiries = await query(
      `SELECT e.id, e.message, e.status, e.customer_name, e.customer_phone, e.created_at,
              s.shop_name, p.name AS product_name
       FROM enquiries e JOIN sellers s ON s.id=e.seller_id LEFT JOIN products p ON p.id=e.product_id
       ORDER BY e.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ success: true, data: { enquiries } });
  } catch (err) {
    console.error('Admin enquiries error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch enquiries.' } });
  }
});

export default router;
