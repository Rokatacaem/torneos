const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTables() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.log('Tables:', res.rows.map(r => r.table_name));

        console.log('\n--- Matches Columns Check ---');
        const mCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'matches'
        `);
        console.log('Matches Columns count:', mCols.rows.length);
        mCols.rows.forEach(r => console.log(r.column_name));

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

checkTables();
