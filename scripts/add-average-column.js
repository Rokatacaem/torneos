const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env
try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) { console.log('No .env.local'); }

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        await client.connect();

        // 1. Players: average
        await client.query(`
            ALTER TABLE players 
            ADD COLUMN IF NOT EXISTS average FLOAT DEFAULT 0.0;
        `);
        console.log('Added average to players');

        // 2. Tournament Players: average (snapshot for tournament)
        await client.query(`
            ALTER TABLE tournament_players 
            ADD COLUMN IF NOT EXISTS average FLOAT DEFAULT 0.0;
        `);
        console.log('Added average to tournament_players');

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

migrate();
