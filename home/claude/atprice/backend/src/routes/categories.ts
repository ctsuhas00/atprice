import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db/pool';

const router = Router();

// GET /api/v1/categories
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await query(
      `SELECT c.id, c.name, c.slug, c.description, c.image_url, c.icon, c.sort_order,
              COUNT(DISTINCT p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.active = true
       WHERE c.active = true
       GROUP BY c.id
       ORDER BY c.sort_order, c.name`
    );
    res.json({ success: true, data: { categories } });
  } catch (err) {
    console.error('Categories error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch categories.' } });
  }
});

// GET /api/v1/categories/:slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const category = await queryOne(
      `SELECT c.id, c.name, c.slug, c.description, c.icon,
              COUNT(DISTINCT p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.active = true
       WHERE c.slug = $1 AND c.active = true
       GROUP BY c.id`,
      [req.params.slug]
    );

    if (!category) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found.' } });
    }

    const subcategories = await query(
      'SELECT id, name, slug FROM subcategories WHERE category_id=$1 AND active=true ORDER BY name',
      [(category as Record<string, unknown>).id]
    );

    res.json({ success: true, data: { category, subcategories } });
  } catch (err) {
    console.error('Category detail error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch category.' } });
  }
});

export default router;
