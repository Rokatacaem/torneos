const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        const res = await client.query(`SELECT * FROM players LIMIT 1`);
        if (res.rows.length > 0) {
            console.log('Row keys:', Object.keys(res.rows[0]));
            console.log('Row sample:', res.rows[0]);
        } else {
            console.log('No players found.');
            // Fallback: check schema columns again if no data
            const res2 = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'players'`);
            console.log('Columns:', res2.rows.map(r => r.column_name));
        }
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
