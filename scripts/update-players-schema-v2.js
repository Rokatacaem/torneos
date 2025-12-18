const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
    }
} catch (e) {
    console.error('Error loading .env.local', e);
}

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function updateSchema() {
    try {
        await client.connect();

        console.log('Adding new columns to players table...');

        await client.query(`
            ALTER TABLE players 
            ADD COLUMN IF NOT EXISTS total_carambolas INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS total_innings INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS tournaments_played INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS handicap INTEGER DEFAULT 0;
        `);

        console.log('Schema updated successfully.');

    } catch (e) {
        console.error('Error updating schema:', e);
    } finally {
        await client.end();
    }
}

updateSchema();
