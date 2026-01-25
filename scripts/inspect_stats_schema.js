const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspectSchema() {
    const client = await pool.connect();
    try {
        console.log('--- Tournament Players Columns ---');
        const tpCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tournament_players'
            ORDER BY column_name;
        `);
        tpCols.rows.forEach(r => console.log(`${r.column_name} (${r.data_type})`));

        console.log('\n--- Matches Columns ---');
        const mCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'matches'
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

inspectSchema();
