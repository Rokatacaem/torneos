const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const client = await pool.connect();
        console.log('Adding playoff_innings_limit column to tournaments...');

        await client.query(`
      ALTER TABLE tournaments 
      ADD COLUMN IF NOT EXISTS playoff_innings_limit INTEGER DEFAULT 40;
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
