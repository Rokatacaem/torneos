
const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.log('No .env.local file found or error reading it, relying on process.env');
}

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const tables = ['tournaments', 'players', 'tournament_players', 'tournament_matches', 'tournament_groups', 'tournament_phases'];

        for (const table of tables) {
            console.log(`\n--- Table: ${table} ---`);
            const res = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${table}'
                ORDER BY ordinal_position;
            `);
            res.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
