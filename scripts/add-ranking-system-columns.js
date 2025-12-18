const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('Adding Ranking System Columns...');

        // 1. Update tournament_players (Per Tournament Results)
        console.log('Updating tournament_players table...');
        await client.query(`
            ALTER TABLE tournament_players 
            ADD COLUMN IF NOT EXISTS ranking_points INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS final_position INTEGER;
        `);

        // 2. Update players (Global Stats)
        console.log('Updating players table...');
        await client.query(`
            ALTER TABLE players 
            ADD COLUMN IF NOT EXISTS category VARCHAR(10) DEFAULT 'C',
            ADD COLUMN IF NOT EXISTS tournaments_played INTEGER DEFAULT 0;
        `);

        console.log('Columns added successfully.');

    } catch (err) {
        console.error('Error updating DB:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
