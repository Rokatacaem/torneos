const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkColumns() {
    console.log('DATABASE_URL length:', process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 'undefined');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tournament_matches';
        `);
        console.log('Columns:', res.rows.map(r => r.column_name).sort());

        const hasHighRun = res.rows.some(r => r.column_name === 'high_run_p1');
        console.log('Has high_run_p1:', hasHighRun);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkColumns();
