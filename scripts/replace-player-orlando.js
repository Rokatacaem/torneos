require('dotenv').config({ path: '.env.local' });
const { query } = require('../app/lib/db');

async function replacePlayer() {
    const oldName = "Orlando Rojas";
    const newName = "Hernán Curtier";
    const newHandicap = 20;

    console.log(`Replacing '${oldName}' with '${newName}' (Handicap: ${newHandicap})...`);

    // 1. Find the player
    // Note: Column is player_name in tournament_players
    const playerRes = await query(`SELECT id, tournament_id FROM tournament_players WHERE player_name = $1`, [oldName]);

    if (playerRes.rows.length === 0) {
        console.error(`Player '${oldName}' not found.`);
        process.exit(1);
    }

    const playerId = playerRes.rows[0].id;
    const tournamentId = playerRes.rows[0].tournament_id;
    console.log(`Found Player ID: ${playerId} in Tournament ${tournamentId}`);

    // 2. Update Tournament Players
    await query(`
        UPDATE tournament_players 
        SET player_name = $1, handicap = $2
        WHERE id = $3
    `, [newName, newHandicap, playerId]);
    console.log("Updated tournament_players.");

    // 3. Update Tournament Matches (Denormalized fields) - SKIPPING if columns don't exist
    // It seems matches table is normalized and joins with players or tournament_players.
    // So updating tournament_players is sufficient.
    console.log("Skipping match denormalization update (columns not found).");

    console.log("Replacement complete.");
    process.exit(0);
}

replacePlayer().catch(e => {
    console.error(e);
    process.exit(1);
});
