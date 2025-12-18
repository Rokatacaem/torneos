const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('--- MIGRATION: ADD club_id TO users ---');

        // 1. Check clubs ID type
        const typeRes = await client.query(`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'clubs' AND column_name = 'id';
        `);
        const idType = typeRes.rows[0]?.data_type;
        console.log(`Clubs ID type is: ${idType}`);

        // 2. Add Column (Safe if exists)
        // We cast to the correct type based on inspection, but typically it is uuid.
        // If it is 'integer', we use INT. If 'uuid', we use UUID.

        // Note: ALTER TABLE ADD COLUMN IF NOT EXISTS is supported in PG 9.6+
        let alterQuery = '';
        if (idType === 'uuid') {
            alterQuery = `ALTER TABLE users ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE SET NULL;`;
        } else if (idType === 'integer') {
            alterQuery = `ALTER TABLE users ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL;`;
        } else {
            console.error('Unknown ID type for clubs:', idType);
            return;
        }

        console.log('Executing:', alterQuery);
        await client.query(alterQuery);
        console.log('Migration successful.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
