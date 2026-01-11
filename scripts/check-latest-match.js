const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkLatestMatch() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const res = await pool.query(`
            SELECT id, score_p1, score_p2, status, high_run_p1, high_run_p2, updated_at
            FROM tournament_matches
            ORDER BY updated_at DESC
            LIMIT 5;
        `);
        console.log('Latest Matches:', res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkLatestMatch();
