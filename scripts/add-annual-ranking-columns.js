const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const client = await pool.connect();

        console.log("Adding Annual Ranking columns...");

        // Add ranking_annual
        await client.query(`
            ALTER TABLE players 
            ADD COLUMN IF NOT EXISTS ranking_annual INTEGER DEFAULT 0;
        `);
        console.log("Added ranking_annual");

        // Add tournaments_played_annual
        await client.query(`
            ALTER TABLE players 
            ADD COLUMN IF NOT EXISTS tournaments_played_annual INTEGER DEFAULT 0;
        `);
        console.log("Added tournaments_played_annual");

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
