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
        console.log('Adding referee_name column to tournament_matches...');

        await client.query(`
            ALTER TABLE tournament_matches 
            ADD COLUMN IF NOT EXISTS referee_name VARCHAR(255);
        `);

        console.log('Column added successfully or already exists.');
    } catch (err) {
        console.error('Error migrating DB:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
