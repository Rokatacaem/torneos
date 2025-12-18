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

        // 1. Tournaments: tables_available
        await client.query(`
            ALTER TABLE tournaments 
            ADD COLUMN IF NOT EXISTS tables_available INTEGER DEFAULT 4;
        `);
        console.log('Added tables_available to tournaments');

        // 2. Tournament Groups: start_time, table_assignment
        await client.query(`
            ALTER TABLE tournament_groups 
            ADD COLUMN IF NOT EXISTS start_time TIMESTAMP,
            ADD COLUMN IF NOT EXISTS table_assignment INTEGER;
        `);
        console.log('Added columns to tournament_groups');

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

migrate();
