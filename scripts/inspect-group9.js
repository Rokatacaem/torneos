require('dotenv').config({ path: '.env.local' });
const { query } = require('../app/lib/db');

async function inspect() {
    console.log("Searching for Ostos/Orozco/Johnson matches...");

    // Find players
    const players = await query(`
        SELECT id, player_name, handicap FROM tournament_players 
        WHERE player_name ILIKE '%Ostos%' OR player_name ILIKE '%Orozco%' OR player_name ILIKE '%Johnson%'
    `);
    console.log("Players:", players.rows);

    if (players.rows.length === 0) return;

    const ids = players.rows.map(p => p.id);

    // Find matches
    const matches = await query(`
        SELECT id, player1_name, player2_name, score_p1, score_p2, winner_id, win_reason, status
        FROM tournament_matches 
        WHERE player1_id = ANY($1) OR player2_id = ANY($1)
    `, [ids]);

    console.table(matches.rows);
    process.exit(0);
}
inspect();
