const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function analyze() {
    try {
        // 1. Get recent tournaments
        const tRes = await pool.query('SELECT id, name FROM tournaments ORDER BY id DESC LIMIT 5');
        console.log('Recent Tournaments:', tRes.rows);

        // Assume ID 34 based on user input, or take the latest
        const tournamentId = 34;
        console.log(`Analyzing Tournament ${tournamentId}...`);

        // 2. Find groups with exactly 2 players
        const groupsRes = await pool.query(`
            SELECT g.id, g.name, COUNT(gp.player_id) as player_count
            FROM tournament_groups g
            JOIN tournament_players gp ON g.id = gp.group_id
            WHERE g.tournament_id = $1
            GROUP BY g.id, g.name
            HAVING COUNT(gp.player_id) = 2
        `, [tournamentId]);

        console.log(`Found ${groupsRes.rows.length} groups with 2 players.`);

        for (const group of groupsRes.rows) {
            // 3. Count matches for this group
            const mRes = await pool.query(`
                SELECT id, player1_id, player2_id, status 
                FROM tournament_matches 
                WHERE group_id = $1
            `, [group.id]);

            console.log(`Group ${group.name} (ID ${group.id}): ${mRes.rowCount} matches.`);
            if (mRes.rowCount === 1) {
                console.log(`  -> PROBLEM: Shortage of matches!`);
                console.log(`  -> Existing Match: ${mRes.rows[0].player1_id} vs ${mRes.rows[0].player2_id}`);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

analyze();
