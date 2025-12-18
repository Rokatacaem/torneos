const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const client = await pool.connect();

        console.log('Adding columns to tournaments table...');

        await client.query(`
            ALTER TABLE tournaments 
            ADD COLUMN IF NOT EXISTS playoff_target_size INTEGER DEFAULT 16,
            ADD COLUMN IF NOT EXISTS qualifiers_per_group INTEGER DEFAULT 2
        `);

        console.log('Columns added successfully.');

        client.release();
    } catch (err) {
        console.error('Error migrating DB:', err);
    } finally {
        pool.end();
    }
}
run();
