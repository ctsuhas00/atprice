import 'dotenv/config';
import { pool } from './pool';

async function reset() {
  const client = await pool.connect();
  try {
    console.log('⚠️  Dropping all tables...');
    await client.query(`
      DROP TABLE IF EXISTS enquiries, seller_listings, product_images,
        products, subcategories, categories, sellers, sessions, users,
        _migrations CASCADE;
      DROP FUNCTION IF EXISTS update_product_search_vector() CASCADE;
      DROP FUNCTION IF EXISTS generate_product_slug() CASCADE;
      DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
      DROP FUNCTION IF EXISTS haversine_km(float8,float8,float8,float8) CASCADE;
    `);
    console.log('✓ Tables dropped');
  } finally {
    client.release();
    await pool.end();
  }
}

reset().catch(err => {
  console.error('Reset failed:', err);
  process.exit(1);
});
