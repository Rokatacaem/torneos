const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    try {
        const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
        const match = envFile.match(/DATABASE_URL=(.*)/);
        if (match) connectionString = match[1].trim().replace(/^"|"$/g, '');
    } catch (e) { }
}

const pool = new Pool({
    connectionString,
    ssl: connectionString && connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});

async function migrate() {
    try {
        console.log('Starting migration for player photos...');
        await pool.query(`
            ALTER TABLE players
            ADD COLUMN IF NOT EXISTS photo_url TEXT;
        `);
        console.log('Migration completed: Added photo_url to players table.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
