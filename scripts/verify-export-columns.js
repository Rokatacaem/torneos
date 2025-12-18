const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log("Running export query verification...");
        const res = await client.query(`
                SELECT 
                    p.ranking as "Ranking",
                    p.name as "Nombre", 
                    c.name as "Club",
                    p.average as "Promedio",
                    p.identification as "ID"
                FROM players p
                LEFT JOIN clubs c ON p.club_id = c.id
                ORDER BY 
                    CASE WHEN p.ranking > 0 THEN p.ranking ELSE 999999 END ASC, 
                    p.name ASC
                LIMIT 3
            `);
        console.log("Returned Rows:", res.rows);
    } catch (err) {
        console.error("Query Error:", err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
