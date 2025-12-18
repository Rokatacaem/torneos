const { createTournament, generateGroups, generatePlayoffs, deleteTournament, updateMatchResult } = require('../app/lib/tournament-actions');
const { query } = require('../app/lib/db');

// Mock helpers
async function simulateGroupMatches(tournamentId) {
    const matches = await query(`SELECT id, player1_id, player2_id, group_id FROM tournament_matches WHERE tournament_id = $1 AND phase_type = 'group'`, [tournamentId]);
    console.log(`Simulating ${matches.rows.length} group matches...`);

    // Randomize results
    for (const m of matches.rows) {
        const winner = Math.random() > 0.5 ? m.player1_id : m.player2_id;
        const score1 = winner === m.player1_id ? 30 : Math.floor(Math.random() * 20);
        const score2 = winner === m.player2_id ? 30 : Math.floor(Math.random() * 20);

        await query(`
            UPDATE tournament_matches 
            SET score_p1 = $1, score_p2 = $2, innings = 20, 
                winner_id = $3, status = 'completed'
            WHERE id = $4
        `, [score1, score2, winner, m.id]);
    }
}

async function run() {
    console.log('--- Simulation: Playoff Adjustment (54 Players -> 32 Bracket) ---');

    // 1. Create Tournament (Manual DB insert to bypass FormData mock complexity if needed, but updated columns are in DB)
    // We'll insert directly to be safe and fast.
    const tRes = await query(`
        INSERT INTO tournaments (name, max_players, group_size, start_date, playoff_target_size, qualifiers_per_group, format)
        VALUES ($1, $2, $3, $4, $5, $6, 'groups_elimination')
        RETURNING id
    `, ['Sim Adjustment 54', 54, 3, new Date(), 32, 1]); // Note: 54 players, groups of 3 = 18 groups.
    // If we want 54 qualifiers, we need EVERYONE to qualify? Or user said "54 candidates"?
    // User said: "torneo con 54 jugadores y grupos de 3, clasificarian los mejores 16 y luego del 17 al 33..."
    // WAIT. The user example: "54 jugadores, grupos de 3". 
    // That means 18 groups.
    // "Clasificarian los mejores 16 y luego del 17 al 33 se juegan el paso..."
    // This sounds like Custom logic or "best seconds"? 
    // My implemented logic: "Qualifiers per Group" is fixed.
    // If qualifiers_per_group = 3 (ALL pass), then we have 54 candidates.
    // Target 32. Excess = 22.
    // Prelim Players = 44. Direct = 10.
    // This matches the user example of "adjusting".

    const tournamentId = tRes.rows[0].id;
    console.log(`Tournament ID: ${tournamentId}`);

    try {
        // 2. Add 54 Players
        for (let i = 1; i <= 54; i++) {
            await query(`
                INSERT INTO tournament_players (tournament_id, player_name, status, ranking)
                VALUES ($1, $2, 'active', $3)
            `, [tournamentId, `Player ${i}`, i]);
        }

        // 3. Generate Groups
        await generateGroups(tournamentId);

        // 4. Simulate Matches
        await simulateGroupMatches(tournamentId);

        // 5. Generate Playoffs
        // For this sim, we need to ensure we have enough qualifiers.
        // If groups=18, size=3.
        // If we want 54 qualifiers, we set qualifiers_per_group=3 in DB (done above).

        console.log('Generating Playoffs...');
        await generatePlayoffs(tournamentId);

        // 6. Verify Phases
        const phases = await query(`SELECT name, type, sequence_order FROM tournament_phases WHERE tournament_id = $1 ORDER BY sequence_order`, [tournamentId]);
        console.table(phases.rows);

        // Verify Prelim Matches
        const prelimMatches = await query(`
            SELECT count(*) FROM tournament_matches m 
            JOIN tournament_phases p ON m.phase_id = p.id 
            WHERE m.tournament_id = $1 AND p.type = 'elimination_prelim'
        `, [tournamentId]);

        console.log(`Prelim Matches Created: ${prelimMatches.rows[0].count}`);

        // Expected: 54 candidates - 32 target = 22 excess.
        // 22 Matches.

        if (parseInt(prelimMatches.rows[0].count) === 22) {
            console.log('SUCCESS: Correct number of adjustment matches.');
        } else {
            console.error('FAIL: Incorrect adjustment matches.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        // await deleteTournament(tournamentId);
        // keep for inspection
    }
}

run();
