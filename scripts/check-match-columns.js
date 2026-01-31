require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const isLocal = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false },
});

async function checkSchema() {
    try {
        console.log("Connecting to DB...");
        const client = await pool.connect();
        console.log("Connected.");

        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tournament_matches';
        `);
        console.log("Columns:", res.rows.map(r => r.column_name));

        client.release();
        await pool.end();
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

checkSchema();
