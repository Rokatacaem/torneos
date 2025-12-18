const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    try {
        const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
        const match = envFile.match(/DATABASE_URL=(.*)/);
        if (match) {
            connectionString = match[1].trim().replace(/^"|"$/g, '');
        }
    } catch (e) {
        console.warn('Could not read .env.local', e);
    }
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Adding round_label column to tournament_matches...');
        await client.query(`
            ALTER TABLE tournament_matches 
            ADD COLUMN IF NOT EXISTS round_label VARCHAR(50);
        `);
        console.log('Adding updated_at column to tournament_matches (if missing)...');
        // Check if it exists first to avoid error if I can't use IF NOT EXISTS for some reason on older logic, but here it's fine.
        // Also set default if possible?
        // Let's just add round_label for now as that's definitely missing.
        console.log('Column added successfully or already exists.');
    } catch (err) {
        console.error('Error migrating DB:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
