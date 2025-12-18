const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('Adding use_handicap column to tournaments...');
        await client.query(`
      ALTER TABLE tournaments 
      ADD COLUMN IF NOT EXISTS use_handicap BOOLEAN DEFAULT FALSE;
    `);
        console.log('Column added successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
