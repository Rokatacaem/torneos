require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function getMatchDetails(matchId) {
    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT m.*, t.name as tournament_name, g.name as group_name
            FROM tournament_matches m
            JOIN tournaments t ON m.tournament_id = t.id
            LEFT JOIN tournament_groups g ON m.group_id = g.id
            WHERE m.id = $1
        `, [matchId]);

        console.log("Match:", res.rows[0]);

        if (res.rows[0] && res.rows[0].group_id) {
            const groupRes = await client.query(`
                SELECT * FROM tournament_matches 
                WHERE group_id = $1 AND tournament_id = $2
                ORDER BY id
            `, [res.rows[0].group_id, res.rows[0].tournament_id]);
            console.log("Group Matches Count:", groupRes.rowCount);
            console.log("Group Matches:", groupRes.rows.map(m => ({ id: m.id, p1: m.player1_id, p2: m.player2_id, status: m.status })));
        }

        client.release();
        await pool.end();
    } catch (e) {
        console.error("Error:", e);
    }
}

getMatchDetails(1650);
