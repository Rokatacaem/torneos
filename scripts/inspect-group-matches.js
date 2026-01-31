require('dotenv').config({ path: '.env.local' });
const { query } = require('../app/lib/db');

async function inspect() {
    console.log("Searching for Curtier matches...");
    const pRes = await query(`SELECT id, player_name FROM tournament_players WHERE player_name ILIKE '%Curtier%'`);
    if (pRes.rows.length === 0) return;
    const pid = pRes.rows[0].id;
    console.log(`Player ID: ${pid} Name: ${pRes.rows[0].player_name}`);

    const matches = await query(`
        SELECT id, player1_id, player2_id, score_p1, score_p2, winner_id, win_reason, status, group_id
        FROM tournament_matches 
        WHERE player1_id = $1 OR player2_id = $1
    `, [pid]);

    console.log(JSON.stringify(matches.rows, null, 2));
    process.exit(0);
}
inspect();
