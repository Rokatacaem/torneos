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
    const client = await pool.connect();
    try {
        const tables = ['tournaments', 'tournament_matches', 'players', 'tournament_phases', 'tournament_groups', 'clubs'];
        for (const tbl of tables) {
            console.log(`\n--- ${tbl} Columns ---`);
            const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [tbl]);
            res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
        }
    } finally {
        client.release();
        pool.end();
    }
}
check();
