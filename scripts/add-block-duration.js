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

async function run() {
    const client = await pool.connect();
    try {
        console.log('Adding block_duration column to tournaments table...');

        // Add block_duration column
        await client.query(`
            ALTER TABLE tournaments 
            ADD COLUMN IF NOT EXISTS block_duration INTEGER;
        `);

        console.log('Column block_duration added successfully.');

    } catch (err) {
        console.error('Error running migration:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
