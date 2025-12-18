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
        console.log('Adding status column to tournament_players table...');

        // Add status column with default 'active'
        await client.query(`
            ALTER TABLE tournament_players 
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
        `);

        // Update existing rows to have 'active' if null (though DEFAULT handles new ones)
        await client.query(`UPDATE tournament_players SET status = 'active' WHERE status IS NULL`);

        console.log('Column status added successfully.');

    } catch (err) {
        console.error('Error running migration:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
