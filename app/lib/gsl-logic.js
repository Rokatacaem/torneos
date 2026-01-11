import { query } from './db';

export async function checkGSLAdvancement(matchId) {
    // 1. Get Match Info & Group Context
    const matchRes = await query(`
        SELECT m.*, t.group_format 
        FROM tournament_matches m
        JOIN tournaments t ON m.tournament_id = t.id
        WHERE m.id = $1
    `, [matchId]);

    const match = matchRes.rows[0];
    if (!match || match.phase_type !== 'group' || match.group_format !== 'gsl') {
        return; // Not a GSL group match
    }

    const { group_id, tournament_id, phase_id } = match;

    // 2. Fetch all matches in this group
    const groupMatchesRes = await query(`
        SELECT * FROM tournament_matches 
        WHERE group_id = $1 
        ORDER BY id ASC
    `, [group_id]);

    const matches = groupMatchesRes.rows;
    const completedCount = matches.filter(m => m.status === 'completed').length;

    // 3. Logic based on matches count
    // Initial State: 2 matches (Round 1)
    if (matches.length === 2) {
        if (completedCount === 2) {
            // Both Round 1 matches done. Create Round 2.
            const m1 = matches[0];
            const m2 = matches[1];

            // Determine Winners and Losers
            // Assuming default structure, but we rely on actual results
            const w1 = m1.winner_id;
            const l1 = m1.winner_id === m1.player1_id ? m1.player2_id : m1.player1_id;

            const w2 = m2.winner_id;
            const l2 = m2.winner_id === m2.player1_id ? m2.player2_id : m2.player1_id;

            // Match 3: Winners (Round 2)
            await query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number)
                VALUES ($1, $2, $3, $4, $5, 'scheduled', 2)
            `, [tournament_id, phase_id, group_id, w1, w2]);

            // Match 4: Losers (Round 2)
            await query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number)
                VALUES ($1, $2, $3, $4, $5, 'scheduled', 2)
            `, [tournament_id, phase_id, group_id, l1, l2]);

            console.log(`GSL Group ${group_id}: Generated Round 2 matches (Winners & Losers).`);
        }
        return;
    }

    // Round 2 Exists (4 matches total)
    if (matches.length === 4) {
        // Check if Round 2 matches (Index 2 and 3) are done
        const m3 = matches[2]; // Winners Match
        const m4 = matches[3]; // Losers Match

        if (m3.status === 'completed' && m4.status === 'completed') {
            // Determine players for Decider (Match 5)
            // Decider: Loser of M3 vs Winner of M4

            const loserM3 = m3.winner_id === m3.player1_id ? m3.player2_id : m3.player1_id;
            const winnerM4 = m4.winner_id;

            // Match 5: Decider (Round 3)
            await query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number)
                VALUES ($1, $2, $3, $4, $5, 'scheduled', 3)
            `, [tournament_id, phase_id, group_id, loserM3, winnerM4]);

            console.log(`GSL Group ${group_id}: Generated Round 3 Decider Match.`);
        }
        return;
    }

    // Round 3 Exists (5 matches total)
    if (matches.length === 5) {
        // Check if Decider is done
        const m5 = matches[4];
        if (m5.status === 'completed') {
            console.log(`GSL Group ${group_id}: Group Completed.`);
            // No more matches to generate.
        }
    }
}
