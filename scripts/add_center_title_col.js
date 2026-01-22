const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
} catch (e) {
    console.error(e);
}

if (!process.env.DATABASE_URL) process.exit(1);

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Adding footer_center_title column...');

        await client.query(`
            ALTER TABLE tournaments 
            ADD COLUMN IF NOT EXISTS footer_center_title VARCHAR(255);
        `);

        console.log('✅ Column footer_center_title added.');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
