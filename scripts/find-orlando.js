require('dotenv').config({ path: '.env.local' });
const { query } = require('../app/lib/db');

async function inspect() {
    console.log("Checking match 1654...");
    const res = await query(`SELECT id, player1_id, player2_id FROM tournament_matches WHERE id = 1654`);
    console.log("Match:", res.rows[0]);

    if (res.rows.length > 0) {
        const m = res.rows[0];
        const pRes = await query(`SELECT id, player_name, handicap FROM tournament_players WHERE id IN ($1, $2)`, [m.player1_id, m.player2_id]);
        console.log("Players:", JSON.stringify(pRes.rows, null, 2));
    }
    process.exit(0);
}
inspect();
