const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
    }
} catch (e) { }

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function deleteDup() {
    try {
        await client.connect();
        await client.query("DELETE FROM players WHERE id = '6755f2f1-9874-4131-b262-8228de713f8f'");
        console.log('Deleted duplicate successfully.');
    } catch (e) { console.error(e); }
    finally { await client.end(); }
}

deleteDup();
