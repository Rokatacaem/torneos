const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tournaments'
            ORDER BY column_name;
        `);
        console.log('Columns:', res.rows.map(r => r.column_name));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
