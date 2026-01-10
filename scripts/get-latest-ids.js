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

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } || false });

async function check() {
    const client = await pool.connect();
    try {
        const t = await client.query('SELECT id, name, banner_image_url FROM tournaments ORDER BY id DESC LIMIT 1');
        console.log('Last Tournament:', t.rows[0]);
        const p = await client.query('SELECT id, name, photo_url FROM players ORDER BY id DESC LIMIT 1');
        console.log('Last Player:', p.rows[0]);
        const c = await client.query('SELECT id, name, logo_url FROM clubs ORDER BY id DESC LIMIT 1');
        console.log('Last Club:', c.rows[0]);
    } finally {
        client.release();
        pool.end();
    }
}
check();
