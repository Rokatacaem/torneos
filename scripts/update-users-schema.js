const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function updateSchema() {
    try {
        await client.connect();
        console.log('Connected to database');

        console.log('Adding player_id column to users table...');

        // Add player_id column
        await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players(id) ON DELETE SET NULL;
    `);

        // Add photo_url to users? Or rely on linking to players?
        // Plan says "Unified User Table", but profile data in "players".
        // So 'player_id' is enough.

        console.log('Schema updated successfully.');
    } catch (err) {
        console.error('Error updating schema:', err);
    } finally {
        await client.end();
    }
}

updateSchema();
