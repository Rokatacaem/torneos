const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function addLocationUrl() {
    const client = await pool.connect();
    try {
        console.log('Checking if location_url column exists in clubs table...');

        // Check if column exists
        const checkRes = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'clubs' AND column_name = 'location_url';
        `);

        if (checkRes.rows.length === 0) {
            console.log('Adding location_url column...');
            await client.query(`
                ALTER TABLE clubs
                ADD COLUMN location_url TEXT;
            `);
            console.log('Column location_url added successfully.');
        } else {
            console.log('Column location_url already exists.');
        }

    } catch (err) {
        console.error('Error adding column:', err);
    } finally {
        client.release();
        pool.end();
    }
}

addLocationUrl();
