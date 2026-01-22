const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Try load .env.local
try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
    }
} catch (e) {
    console.error('Error loading .env.local', e);
}

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set.");
    process.exit(1);
}

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB.');

        console.log('Adding is_official column to tournaments table...');
        await client.query(`
            ALTER TABLE tournaments 
            ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT FALSE;
        `);

        console.log('✅ Column added successfully.');

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await client.end();
    }
}

run();
