const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    try {
        const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
        const match = envFile.match(/DATABASE_URL=(.*)/);
        if (match) connectionString = match[1].trim().replace(/^"|"$/g, '');
    } catch (e) { }
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function check() {
    try {
        const res = await pool.query("SELECT id, name, status, logo_image_url FROM tournaments ORDER BY id DESC LIMIT 1");
        console.log('Latest Tournament:', res.rows[0]);
    } catch (e) { console.error(e); }
    finally { pool.end(); }
}
check();
