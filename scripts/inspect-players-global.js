const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspectPlayers() {
    const client = await pool.connect();
    try {
        console.log('--- PLAYERS SCHEMA ---');
        // Check if players table exists first
        const tableRes = await client.query("SELECT to_regclass('public.players')");
        if (!tableRes.rows[0].to_regclass) {
            console.log('Table "players" does not exist.');
        } else {
            const res = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'players';
            `);
            console.log(res.rows);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

inspectPlayers();
