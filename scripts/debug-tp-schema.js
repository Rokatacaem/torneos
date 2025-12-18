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
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tournament_players'
        `);
        console.log('Columns in tournament_players:', res.rows.map(r => r.column_name));
    } catch (e) { console.error(e); }
    finally { pool.end(); }
}
check();
