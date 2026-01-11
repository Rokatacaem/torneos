const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fix() {
    try {
        const tournamentId = 34;
        console.log(`Fixing Tournament ${tournamentId}...`);

        // Find groups with only 1 match
        const problemGroups = await pool.query(`
            SELECT m.group_id, g.name, COUNT(m.id) as match_count
            FROM tournament_matches m
            JOIN tournament_groups g ON m.group_id = g.id
            WHERE m.tournament_id = $1
            GROUP BY m.group_id, g.name
            HAVING COUNT(m.id) = 1
        `, [tournamentId]);

        console.log(`Found ${problemGroups.rowCount} groups with 1 match.`);

        for (const group of problemGroups.rows) {
            console.log(`Fixing Group ${group.name}...`);

            // Get existing match details
            const mRes = await pool.query(`
                SELECT * FROM tournament_matches WHERE group_id = $1
            `, [group.group_id]);

            const existing = mRes.rows[0];
            const { phase_id, player1_id, player2_id } = existing;

            console.log(`  Existing: P1(${player1_id}) vs P2(${player2_id})`);

            // Check if players are different (sanity check)
            if (player1_id === player2_id) {
                console.log(`  Skipping: Same player?`);
                continue;
            }

            // Insert Reciprocal Match
            console.log(`  Inserting: P1(${player2_id}) vs P2(${player1_id})`);

            const insertRes = await pool.query(`
                INSERT INTO tournament_matches (
                    tournament_id, phase_id, group_id, player1_id, player2_id, status, table_number
                ) VALUES ($1, $2, $3, $4, $5, 'scheduled', NULL)
                RETURNING id
            `, [tournamentId, phase_id, group.group_id, player2_id, player1_id]);

            console.log(`  -> Created Match ID: ${insertRes.rows[0].id}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

fix();
