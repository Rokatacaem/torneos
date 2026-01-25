const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspectMatches() {
    const client = await pool.connect();
    try {
        console.log('\n--- Tournament Matches Columns ---');
        const mCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tournament_matches'
            ORDER BY column_name;
        `);
        mCols.rows.forEach(r => console.log(`${r.column_name} (${r.data_type})`));
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

inspectMatches();
