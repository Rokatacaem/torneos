
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
});

async function addColumn() {
    const client = await pool.connect();
    try {
        console.log('Checking for branding_image_url column...');
        await client.query(`
      ALTER TABLE tournaments 
      ADD COLUMN IF NOT EXISTS branding_image_url text;
    `);
        console.log('Column branding_image_url ensured.');
    } catch (err) {
        console.error('Error adding column:', err);
    } finally {
        client.release();
        pool.end();
    }
}

addColumn();
