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


    // Helper to determine W/L
    const getResult = (m) => {
        if (m.status !== 'completed' || !m.winner_id) return null;
        const winner = m.winner_id;
        const loser = m.winner_id === m.player1_id ? m.player2_id : m.player1_id;
        return { winner, loser };
    };

    // 3. Logic based on matches count

    // CASE A: Legacy/Partial (matches missing)
    if (matches.length < 5) {
        // Round 1 Done? -> Create Round 2
        if (matches.length === 2 && matches[0].status === 'completed' && matches[1].status === 'completed') {
            const r1 = getResult(matches[0]);
            const r2 = getResult(matches[1]);

            // Match 3 (Winners)
            await query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number)
                VALUES ($1, $2, $3, $4, $5, 'scheduled', 2)
            `, [tournament_id, phase_id, group_id, r1.winner, r2.winner]);

            // Match 4 (Losers)
            await query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number)
                VALUES ($1, $2, $3, $4, $5, 'scheduled', 2)
            `, [tournament_id, phase_id, group_id, r1.loser, r2.loser]);

            console.log(`GSL Group ${group_id}: Generated Round 2 matches (legacy).`);
            return;
        }

        // Round 2 Done? -> Create Round 3 (Decider)
        if (matches.length === 4 && matches[2].status === 'completed' && matches[3].status === 'completed') {
            const m3 = matches[2]; // Winners Match
            const m4 = matches[3]; // Losers Match

            // Decider: Loser of M3 vs Winner of M4
            const loserM3 = m3.winner_id === m3.player1_id ? m3.player2_id : m3.player1_id;
            const winnerM4 = m4.winner_id;

            await query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number)
                VALUES ($1, $2, $3, $4, $5, 'scheduled', 3)
            `, [tournament_id, phase_id, group_id, loserM3, winnerM4]);

            console.log(`GSL Group ${group_id}: Generated Decider match (legacy).`);
            return;
        }
    }

    // CASE B: Pre-filled (5 matches exist, likely placeholders)
    if (matches.length === 5) {
        // Update Round 2 (M3, M4) if empty
        const m1 = matches[0];
        const m2 = matches[1];
        const m3 = matches[2];
        const m4 = matches[3];

        if (m1.status === 'completed' && m2.status === 'completed') {
            // Only update if they don't have players yet (or force update?)
            // Better to check if they are "TBD" (null players)
            if (!m3.player1_id || !m3.player2_id) {
                const r1 = getResult(m1);
                const r2 = getResult(m2);

                await query(`
                    UPDATE tournament_matches 
                    SET player1_id = $1, player2_id = $2 
                    WHERE id = $3
                `, [r1.winner, r2.winner, m3.id]);

                console.log(`GSL Group ${group_id}: Updated Match 3 (Winners).`);
            }

            if (!m4.player1_id || !m4.player2_id) {
                const r1 = getResult(m1);
                const r2 = getResult(m2);

                await query(`
                    UPDATE tournament_matches 
                    SET player1_id = $1, player2_id = $2 
                    WHERE id = $3
                `, [r1.loser, r2.loser, m4.id]);

                console.log(`GSL Group ${group_id}: Updated Match 4 (Losers).`);
            }
        }

        // Update Round 3 (M5) if empty
        // We need M3 and M4 to be completed
        if (m3.status === 'completed' && m4.status === 'completed') {
            const m5 = matches[4];
            if (!m5.player1_id || !m5.player2_id) {
                const loserM3 = m3.winner_id === m3.player1_id ? m3.player2_id : m3.player1_id;
                const winnerM4 = m4.winner_id; // Winner of losers match

                await query(`
                    UPDATE tournament_matches 
                    SET player1_id = $1, player2_id = $2 
                    WHERE id = $3
                `, [loserM3, winnerM4, m5.id]);

                console.log(`GSL Group ${group_id}: Updated Match 5 (Decider).`);
            }
        }
    }
}
