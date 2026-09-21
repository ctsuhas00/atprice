import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';

const router = Router();

// POST /api/v1/enquiries
router.post('/', async (req: Request, res: Response) => {
  const { seller_id, product_id, listing_id, message, customer_name, customer_phone } = req.body;

  if (!seller_id || !message) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'seller_id and message are required.' },
    });
  }

  if (message.length < 5 || message.length > 2000) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Message must be between 5 and 2000 characters.' },
    });
  }

  try {
    const client = await pool.connect();
    try {
      // Verify seller exists and is verified
      const sellerRes = await client.query(
        "SELECT id FROM sellers WHERE id=$1 AND status='VERIFIED'",
        [seller_id]
      );
      if (sellerRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller not found.' } });
      }

      const customerId = req.isAuthenticated() ? req.user!.id : null;
      const result = await client.query(
        `INSERT INTO enquiries(customer_id, seller_id, product_id, listing_id, message, customer_name, customer_phone, status)
         VALUES($1,$2,$3,$4,$5,$6,$7,'NEW') RETURNING id, created_at`,
        [customerId, seller_id, product_id || null, listing_id || null, message, customer_name || null, customer_phone || null]
      );

      res.status(201).json({
        success: true,
        message: 'Enquiry sent successfully.',
        data: { enquiry_id: result.rows[0].id, created_at: result.rows[0].created_at },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Enquiry error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to send enquiry.' } });
  }
});

export default router;
