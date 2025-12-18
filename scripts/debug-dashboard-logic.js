const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    const client = await pool.connect();

    // 1. Get Tournaments
    const tRes = await client.query('SELECT * FROM tournaments ORDER BY start_date DESC');
    console.log('Tournaments[0]:', tRes.rows[0].id, tRes.rows[0].status);

    // 2. Get Matches for ID 11
    const mRes = await client.query('SELECT count(*) FROM tournament_matches WHERE tournament_id = $1', [tRes.rows[0].id]);
    console.log('Matches count:', mRes.rows[0].count);

    client.release();
    pool.end();
}
run();
