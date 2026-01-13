
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function checkColumn() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tournaments' AND column_name = 'branding_image_url';
    `);

        if (res.rows.length > 0) {
            console.log('Column branding_image_url EXISTS');
        } else {
            console.log('Column branding_image_url DOES NOT EXIST');
        }
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

checkColumn();
