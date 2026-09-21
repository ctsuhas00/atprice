import { Router } from 'express';
import { pool } from '../db/pool';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      success: true,
      data: {
        status: 'ok',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        database: 'connected',
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      data: {
        status: 'degraded',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      },
    });
  }
});

export default router;
