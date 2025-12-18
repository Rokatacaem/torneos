const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT id, name, status, max_players FROM tournaments ORDER BY id DESC LIMIT 5');
        console.table(res.rows);
        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
