const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('--- STARTING MIGRATION ---');

    console.log('1. Deleting ALL players and related data...');
    // Delete dependencies first
    await client.query('DELETE FROM order_items'); // Depends on orders
    await client.query('DELETE FROM orders');      // Depends on sessions
    await client.query('DELETE FROM payments');    // Depends on sessions
    await client.query('DELETE FROM sessions');    // Depends on players/tables

    await client.query('DELETE FROM tournament_matches');
    await client.query('DELETE FROM tournament_players');
    await client.query('DELETE FROM players');
    console.log('--- Players DELETED ---');

    await client.query('DELETE FROM clubs');
    console.log('--- Clubs DELETED ---');

    console.log('2. Updating Clubs Table...');
    // Add country and city columns
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='country') THEN 
          ALTER TABLE clubs ADD COLUMN country TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='city') THEN 
          ALTER TABLE clubs ADD COLUMN city TEXT;
        END IF;
      END $$;
    `);
    console.log('--- Clubs Table Updated ---');

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
