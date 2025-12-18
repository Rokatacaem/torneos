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

const NATIONAL_FILE = 'ranking_national.json';
const ANNUAL_FILE = 'ranking_data.json';

async function inspect() {
    let output = {};
    // 1. Check JSON Source
    try {
        const nat = JSON.parse(fs.readFileSync(NATIONAL_FILE, 'utf8'));
        const ann = JSON.parse(fs.readFileSync(ANNUAL_FILE, 'utf8'));

        output.national = nat.data.filter(p => p.nombre.toLowerCase().includes('salinas'));
        output.annual = ann.data.filter(p => p.nombre.toLowerCase().includes('salinas'));

    } catch (e) { output.error = e.message; }

    // 2. Check DB
    try {
        await client.connect();
        const res = await client.query(`SELECT * FROM players WHERE name ILIKE '%Salinas%'`);
        output.db = res.rows;
    } catch (e) { output.dbError = e.message; }
    finally { await client.end(); }

    fs.writeFileSync('inspect_result.json', JSON.stringify(output, null, 2));
    console.log('Inspection saved to inspect_result.json');
}

inspect();
