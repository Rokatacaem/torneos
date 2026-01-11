const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tournament_groups';
        `);
        console.log('Columns:', res.rows.map(r => r.column_name).sort());
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
