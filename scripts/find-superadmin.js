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
const pool = new Pool({ connectionString, ssl: connectionString && connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false });

async function check() {
    try {
        const res = await pool.query(`SELECT id, name, email, role FROM users WHERE role = 'superadmin' OR role = 'SUPERADMIN'`);
        if (res.rows.length === 0) {
            console.log('No superadmin found.');
        } else {
            console.log('Superadmin users found:', res.rows);
        }
    } catch (e) { console.error(e); }
    finally { pool.end(); }
}
check();
