const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('Adding host_club_id column to tournaments table...');

        // Check if column exists
        const checkRes = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='tournaments' AND column_name='host_club_id'
        `);

        if (checkRes.rows.length === 0) {
            await client.query(`
                ALTER TABLE tournaments 
                ADD COLUMN host_club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL;
            `);
            console.log('Column host_club_id added successfully.');
        } else {
            console.log('Column host_club_id already exists.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
