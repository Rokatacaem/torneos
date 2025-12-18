const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrateMatches() {
    const client = await pool.connect();
    try {
        console.log('--- MIGRATION: ADD STATS TO matches ---');

        // Check existing columns
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'matches';
        `);
        const columns = res.rows.map(r => r.column_name);
        console.log('Existing columns:', columns.join(', '));

        // We need:
        // - innings (int) -> To store total innings of the match
        // - details (jsonb) -> To store generic stats like high_run_p1, high_run_p2, etc.

        if (!columns.includes('innings')) {
            console.log('Adding "innings" column...');
            await client.query('ALTER TABLE matches ADD COLUMN innings INTEGER DEFAULT 0;');
        }

        if (!columns.includes('details')) {
            console.log('Adding "details" column...');
            await client.query('ALTER TABLE matches ADD COLUMN details JSONB DEFAULT \'{}\';');
        }

        console.log('Migration successful.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrateMatches();
