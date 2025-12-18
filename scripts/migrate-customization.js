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
    // Disable SSL for local dev if needed, or allow self-signed
    ssl: connectionString && connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});

async function migrate() {
    try {
        console.log('Starting migration...');

        await pool.query(`
            ALTER TABLE tournaments
            ADD COLUMN IF NOT EXISTS banner_image_url TEXT,
            ADD COLUMN IF NOT EXISTS logo_image_url TEXT,
            ADD COLUMN IF NOT EXISTS semifinal_points_limit INTEGER,
            ADD COLUMN IF NOT EXISTS semifinal_innings_limit INTEGER,
            ADD COLUMN IF NOT EXISTS final_points_limit INTEGER,
            ADD COLUMN IF NOT EXISTS final_innings_limit INTEGER;
        `);

        console.log('Migration completed successfully: Added images and phase limit columns.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
