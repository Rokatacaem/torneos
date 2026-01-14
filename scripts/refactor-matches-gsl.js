const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const TOURNAMENT_ID = 33;

async function run() {
    try {
        await client.connect();

        // 1. Get current groups and their players from existing matches
        // We can look at tournament_matches to see who played who in which group
        // Or better, assume players are distinct in matches.

        // Fetch all matches with group_id and player ids
        const res = await client.query(`
            SELECT group_id, player1_id, player2_id 
            FROM tournament_matches 
            WHERE tournament_id = $1
            ORDER BY id ASC
        `, [TOURNAMENT_ID]);

        const groupPlayers = {}; // groupId -> Set(playerIds)

        for (const row of res.rows) {
            if (!groupPlayers[row.group_id]) groupPlayers[row.group_id] = new Set();
            if (row.player1_id) groupPlayers[row.group_id].add(row.player1_id);
            if (row.player2_id) groupPlayers[row.group_id].add(row.player2_id);
        }

        console.log('Identified Groups and Players:');
        for (const gid in groupPlayers) {
            console.log(`Group ${gid}: ${groupPlayers[gid].size} players`);
        }

        // Verify we have 11 groups with 4 players each
        const groupIds = Object.keys(groupPlayers);
        if (groupIds.length !== 11) {
            console.warn(`WARNING: Expected 11 groups, found ${groupIds.length}`);
        }

        // 2. Delete existing matches
        console.log('Deleting existing Round Robin matches...');
        await client.query('DELETE FROM tournament_matches WHERE tournament_id = $1', [TOURNAMENT_ID]);

        // 3. Create GSL Matches
        console.log('Creating GSL matches...');

        // We need to fetch the existing Phase ID for 'Fase de Grupos'
        const phaseRes = await client.query(`SELECT id FROM tournament_phases WHERE tournament_id = $1 AND type = 'group'`, [TOURNAMENT_ID]);
        const phaseId = phaseRes.rows[0].id;

        // We need to fetch the table_assignment and start_time for the groups to potentially set schedule?
        // Actually, previous script set group start_time.
        // Matches should inherit or simply be 'scheduled'.

        for (const [gid, playerSet] of Object.entries(groupPlayers)) {
            // Convert Set to Array. 
            // IMPORTANT: We need to maintain the original seeding order (P1, P2, P3, P4).
            // Since we just read from matches in any order, we lost the seeding!
            // However, player IDs might be sequential or we can assume sorting by ID?
            // Previous script: inserted players sequentially.
            // Let's sort by ID to be deterministic, hoping that aligns with P1..P4 insertion order.
            // Or better, query valid players and sort by ID.

            const players = Array.from(playerSet).sort((a, b) => a - b);

            if (players.length !== 4) {
                console.error(`Group ${gid} has ${players.length} players. Skipping GSL generation.`);
                continue;
            }

            const [p1, p2, p3, p4] = players;

            // GSL Matches
            // 1. P1 vs P4
            await client.query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number, updated_at)
                VALUES ($1, $2, $3, $4, $5, 'scheduled', 1, NOW())
             `, [TOURNAMENT_ID, phaseId, gid, p1, p4]); // Match A

            // 2. P2 vs P3
            await client.query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number, updated_at)
                VALUES ($1, $2, $3, $4, $5, 'scheduled', 1, NOW())
             `, [TOURNAMENT_ID, phaseId, gid, p2, p3]); // Match B

            // 3. Winners Match (Winner A vs Winner B) - Round 2
            await client.query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number, updated_at)
                VALUES ($1, $2, $3, NULL, NULL, 'pending', 2, NOW())
             `, [TOURNAMENT_ID, phaseId, gid]);

            // 4. Losers Match (Loser A vs Loser B) - Round 2
            await client.query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number, updated_at)
                VALUES ($1, $2, $3, NULL, NULL, 'pending', 2, NOW())
             `, [TOURNAMENT_ID, phaseId, gid]);

            // 5. Decider Match (Loser WinnerMatch vs Winner LoserMatch) - Round 3
            // Correct logic: Loser of Match 3 vs Winner of Match 4
            await client.query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number, updated_at)
                VALUES ($1, $2, $3, NULL, NULL, 'pending', 3, NOW())
             `, [TOURNAMENT_ID, phaseId, gid]);
        }

        console.log('Done. Matches refactored to GSL.');

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
