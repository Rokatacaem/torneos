const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'players';
        `);
        console.log('Columns in players table:', res.rows.map(r => r.column_name));
        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
