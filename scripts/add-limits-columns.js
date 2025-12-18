const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const client = await pool.connect();
        console.log('Adding phase limit columns to tournaments...');

        await client.query(`
      ALTER TABLE tournaments 
      ADD COLUMN IF NOT EXISTS group_points_limit INTEGER DEFAULT 30,
      ADD COLUMN IF NOT EXISTS group_innings_limit INTEGER DEFAULT 20,
      ADD COLUMN IF NOT EXISTS playoff_points_limit INTEGER DEFAULT 40;
    `);

        console.log('Success!');
        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

run();
