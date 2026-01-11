const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function analyze() {
    try {
        const tournamentId = 34; // Assuming 34
        console.log(`Analyzing Tournament ${tournamentId}...`);

        // Get groups via matches
        const groupsRes = await pool.query(`
            SELECT DISTINCT m.group_id, g.name
            FROM tournament_matches m
            JOIN tournament_groups g ON m.group_id = g.id
            WHERE m.tournament_id = $1
            ORDER BY g.name
        `, [tournamentId]);

        console.log(`Found ${groupsRes.rowCount} groups with matches.`);

        for (const group of groupsRes.rows) {
            // Count unique players in this group's matches
            const playersRes = await pool.query(`
                SELECT DISTINCT player_id FROM (
                    SELECT player1_id as player_id FROM tournament_matches WHERE group_id = $1
                    UNION
                    SELECT player2_id as player_id FROM tournament_matches WHERE group_id = $1
                ) AS p
            `, [group.group_id]);

            const playerCount = playersRes.rowCount;
            const pIds = playersRes.rows.map(r => r.player_id);

            // Count total matches
            const matchesRes = await pool.query(`
                SELECT id, player1_id, player2_id
                FROM tournament_matches
                WHERE group_id = $1
            `, [group.group_id]);

            const matchCount = matchesRes.rowCount;

            console.log(`Group ${group.name}: ${playerCount} players, ${matchCount} matches.`);

            // Detect anomaly
            if (playerCount === 2 && matchCount < 2) {
                console.log(`  -> PROBLEM: Group ${group.name} needs fix! Matches:`, matchesRes.rows);

                // Identify missing match
                // We existing match is P1 vs P2?
                // We need P2 vs P1.
                // Or vice versa.
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

analyze();
