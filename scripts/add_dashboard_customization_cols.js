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
        console.log('Adding customization columns...');

        await client.query(`
            ALTER TABLE tournaments 
            ADD COLUMN IF NOT EXISTS footer_branding_title VARCHAR(255) DEFAULT 'Copa Hermandad',
            ADD COLUMN IF NOT EXISTS footer_branding_subtitle VARCHAR(255) DEFAULT 'Chile - Argentina',
            ADD COLUMN IF NOT EXISTS footer_info_text VARCHAR(255) DEFAULT 'ENTRADA LIBERADA • SALON PRINCIPAL';
        `);

        console.log('✅ Columns added.');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
