const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log("Running export query...");
        const res = await client.query(`
                SELECT p.name as "Nombre", c.name as "Club"
                FROM players p
                LEFT JOIN clubs c ON (NULLIF(p.current_club, '')::integer) = c.id
                ORDER BY p.name ASC
                LIMIT 5
            `);
        console.log("Rows returned:", res.rows);
    } catch (err) {
        console.error("Query Error:", err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
