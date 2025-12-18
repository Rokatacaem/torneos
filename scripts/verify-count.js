const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    try {
        const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
        const match = envFile.match(/DATABASE_URL=(.*)/);
        if (match) {
            connectionString = match[1].trim().replace(/^"|"$/g, '');
        }
    } catch (e) { }
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const resT = await pool.query('SELECT count(*) FROM tournaments');
        const resP = await pool.query('SELECT count(*) FROM tournament_players');
        console.log(`Verificación DB: ${resT.rows[0].count} torneos, ${resP.rows[0].count} jugadores.`);
    } catch (e) {
        console.error('Error verificación:', e.message);
    } finally {
        pool.end();
    }
}
run();
