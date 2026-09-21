import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pool } from './pool';

async function migrate() {
  const client = await pool.connect();
  try {
    const migrationsDir = path.join(__dirname, '../../../database/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT id FROM _migrations WHERE filename = $1',
        [file]
      );
      if (rows.length > 0) {
        console.log(`  ✓ Already applied: ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`  → Applying: ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations(filename) VALUES($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✓ Applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    console.log('\nAll migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
