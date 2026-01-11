const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const search = '%Sobarzo%';
        console.log(`Searching for player: ${search}`);

        // 1. Find Player
        const pRes = await pool.query(`
            SELECT id, player_name 
            FROM tournament_players 
            WHERE player_name ILIKE $1
        `, [search]);

        if (pRes.rowCount === 0) {
            console.log('Player not found.');
            return;
        }

        const player = pRes.rows[0];
        console.log(`Found Player: ${player.player_name} (ID: ${player.id})`);

        // 2. Get Matches
        const mRes = await pool.query(`
            SELECT m.id, 
                   m.score_p1, m.score_p2, 
                   m.high_run_p1, m.high_run_p2, 
                   m.innings,
                   m.status,
                   p1.player_name as p1_name,
                   p2.player_name as p2_name,
                   m.player1_id
            FROM tournament_matches m
            LEFT JOIN tournament_players p1 ON m.player1_id = p1.id
            LEFT JOIN tournament_players p2 ON m.player2_id = p2.id
            WHERE m.player1_id = $1 OR m.player2_id = $1
            ORDER BY m.id
        `, [player.id]);

        console.log(`Matches (${mRes.rowCount}):`);
        mRes.rows.forEach(m => {
            const isP1 = m.player1_id === player.id;
            const myScore = isP1 ? m.score_p1 : m.score_p2;
            const oppScore = isP1 ? m.score_p2 : m.score_p1;
            const myRun = isP1 ? m.high_run_p1 : m.high_run_p2;
            const oppName = isP1 ? m.p2_name : m.p1_name;

            console.log(`- vs ${oppName}: Result ${myScore}-${oppScore}. High Run: ${myRun}. Innings: ${m.innings}. Status: ${m.status}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
