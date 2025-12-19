const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkClubs() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
      SELECT id, name, logo_url FROM clubs LIMIT 5;
    `);
        console.log(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

checkClubs();
