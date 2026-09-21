import { Router, Request, Response } from 'express';
import passport from 'passport';
import { requireAuth } from '../middleware/auth';
import { pool } from '../db/pool';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// GET /api/v1/auth/me
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      role: user.role,
    },
  });
});

// GET /api/v1/auth/google
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account',
}));

// GET /api/v1/auth/google/callback
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${FRONTEND_URL}/login?error=auth_failed`,
    failureMessage: true,
  }),
  (req: Request, res: Response) => {
    // Successful authentication — redirect to frontend
    const redirectTo = (req.session as { returnTo?: string }).returnTo || `${FRONTEND_URL}/account`;
    delete (req.session as { returnTo?: string }).returnTo;
    res.redirect(redirectTo);
  }
);

// POST /api/v1/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: { code: 'LOGOUT_ERROR', message: 'Logout failed.' } });
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully.' });
    });
  });
});

// POST /api/v1/auth/seller/onboard — Apply to become a seller
router.post('/seller/onboard', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role === 'SELLER' || user.role === 'ADMIN') {
    return res.status(400).json({ success: false, error: { code: 'ALREADY_SELLER', message: 'You are already a seller.' } });
  }

  const { shop_name, owner_name, phone, whatsapp, email, description, address, city, state, pincode, latitude, longitude, business_hours, service_area_km } = req.body;

  if (!shop_name || !owner_name || !phone || !city) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'shop_name, owner_name, phone, and city are required.' } });
  }

  try {
    const client = await pool.connect();
    try {
      // Check if already applied
      const existing = await client.query('SELECT id FROM sellers WHERE user_id=$1', [user.id]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'ALREADY_APPLIED', message: 'You have already submitted a seller application.' } });
      }

      const result = await client.query(
        `INSERT INTO sellers(user_id, shop_name, owner_name, phone, whatsapp, email, description, address, city, state, pincode, latitude, longitude, business_hours, service_area_km, status, is_demo_data)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'PENDING',false) RETURNING id`,
        [user.id, shop_name, owner_name, phone, whatsapp || phone, email || user.email, description, address, city, state || 'Karnataka', pincode, latitude, longitude, business_hours || 'Mon-Sat: 9am-7pm', service_area_km || 10]
      );

      res.status(201).json({
        success: true,
        message: 'Seller application submitted. Pending admin verification.',
        data: { seller_id: result.rows[0].id, status: 'PENDING' },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Seller onboard error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Could not submit application.' } });
  }
});

export default router;
