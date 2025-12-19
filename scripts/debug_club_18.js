const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkClub18() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
      SELECT * FROM clubs WHERE id = 18;
    `);
        console.log('Club 18 Data:', res.rows[0]);

        const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clubs';
    `);
        console.log('Columns:', columns.rows.map(r => r.column_name));

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

checkClub18();
