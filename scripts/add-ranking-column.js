const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');

try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) { }

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        await client.connect();
        await client.query(`
            ALTER TABLE players 
            ADD COLUMN IF NOT EXISTS ranking INTEGER DEFAULT 0;
        `);
        console.log('Added ranking to players');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

migrate();
