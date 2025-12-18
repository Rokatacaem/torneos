const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('--- ADDING CLUB FIELDS ---');
        await client.query(`
      ALTER TABLE clubs 
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS tables_billar INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tables_pool INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tables_bola9 INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tables_snooker INTEGER DEFAULT 0;
    `);
        console.log('--- Columns Added ---');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
