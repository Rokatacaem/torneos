
import { query } from './db';

// Point Scale from User
// 1: 60, 2: 50, 3-4: 40, 5-8: 30, 9-16: 20, 17-32: 10, >32: 5
function getPointsForPosition(pos) {
    if (pos === 1) return 60;
    if (pos === 2) return 50;
    if (pos <= 4) return 40;
    if (pos <= 8) return 30;
    if (pos <= 16) return 20;
    if (pos <= 32) return 10;
    return 5;
}

/**
 * Calculates and saves final positions and points for a SPECIFIC tournament.
 * Simplified Logic:
 * - Winner is #1.
 * - Loser of Final is #2.
 * - Losers of Semis are #3 and #4 (Tie or sorted by stats). Fixed to tie 3 for now or just 3/4.
 *   Technically "3-4" get 40 pts, so precise order 3 vs 4 doesn't matter for points.
 * - Losers of QF are 5-8.
 * - Losers of R16 are 9-16.
 * - Losers of R32 are 17-32.
 * - Group non-qualifiers: Ordered by group stats.
 * 
 * LIMITATION: This assumes standard single elimination bracket.
 */
export async function assignTournamentPoints(tournamentId) {
    // 1. Get Tournament Matches to determine Bracket Progress
    // We need to know who lost in which round.
    // Phases: final, semifinal, quarterfinals (or names), or phase type 'elimination' ordered sequences.

    // Get Elimination Phases ordered DESC (Final first)
    const phasesRes = await query(`
        SELECT * FROM tournament_phases 
        WHERE tournament_id = $1 AND type = 'elimination'
        ORDER BY sequence_order DESC
    `, [tournamentId]);

    const phases = phasesRes.rows;

    // Track assigned players to avoid duplicates
    const assignedPlayers = new Set();
    const updates = []; // { pid, pos, pts }

    // Helper to assign
    const assign = (pid, pos) => {
        if (!pid || assignedPlayers.has(pid)) return;
        assignedPlayers.add(pid);
        updates.push({ pid, pos, pts: getPointsForPosition(pos) });
    };

    // 1. The Champion (Winner of the last phase match)
    if (phases.length > 0) {
        const finalPhase = phases[0]; // Last phase (Final)
        const finalMatchesRes = await query(`
            SELECT * FROM tournament_matches WHERE phase_id = $1 AND status = 'completed'
        `, [finalPhase.id]);

        finalMatchesRes.rows.forEach(m => {
            assign(m.winner_id, 1);
            assign(m.winner_id === m.player1_id ? m.player2_id : m.player1_id, 2);
        });

        // 2. Losers of previous phases
        // Loop from second to last phase (Semis) down to first elimination phase
        for (let i = 1; i < phases.length; i++) {
            const phase = phases[i];
            const matchesRes = await query(`
                SELECT * FROM tournament_matches WHERE phase_id = $1 AND status = 'completed'
            `, [phase.id]);

            // Expected losers count: 
            // Semis (2 matches) -> 2 losers. Rank range 3-4.
            // QF (4 matches) -> 4 losers. Rank range 5-8.
            // R16 (8 matches) -> 8 losers. Rank range 9-16.

            // Determine rank base for this round's losers
            // If it's Semis (i=1), previous had 2 players. This one adds 2 losers. 
            // The "tier" starts at (Players in valid next rounds) + 1.
            // easier: 
            // Final losers: Pos 2.
            // Semi losers: Pos 3 (Range 3-4)
            // QF losers: Pos 5 (Range 5-8)
            // R16 losers: Pos 9 (Range 9-16)
            // Formula: 2^(i) + 1 ? 
            // i=0 (Final): Loser pos 2.
            // i=1 (Semi): Losers pos 3. (2^1 + 1 = 3)
            // i=2 (QF): Losers pos 5. (2^2 + 1 = 5)
            // i=3 (R16): Losers pos 9. (2^3 + 1 = 9)

            const rankBase = Math.pow(2, i) + 1;

            matchesRes.rows.forEach(m => {
                const loserId = m.winner_id === m.player1_id ? m.player2_id : m.player1_id;
                assign(loserId, rankBase);
            });
        }
    }

    // 3. Group Stage / Others
    // Everyone else who is in the tournament but not assigned yet.
    // They get rank 33+ (or 17+ if no R16, etc).
    // Basically, if they qualified to playoffs but didn't play (e.g. lost in prelim), logic might be complex.
    // Simplifying: Everyone else gets "remaining" rank.
    // We should sort them by group performance if possible? 
    // For now, just assign them the next tier points.

    // Find highest rank assigned so far
    let maxRank = 0;
    updates.forEach(u => { if (u.pos > maxRank) maxRank = u.pos; });

    // Logic: If maxRank was 2 (only final), losers are 3.
    // If maxRank was 4 (semis), losers are 5.
    // If maxRank was 16 (R16), losers are 17.
    // The next available rank is roughly the next power of 2 + 1, OR just "Rest of the field".
    // Let's deduce next tier. If we assigned up to pos 16 (losers of R16), next is 17.
    // If we assigned up to pos 8 (losers of QF), next is 9.

    // We need to count how many people played in elimination to know "where we are".
    // Alternatively, just assign "33" to everyone else for safety if it's large, or calculate dynamically.

    // Let's determine the "Elimination floor".
    // If we processed phases, we handled the top X.
    // e.g. 32 player bracket -> We handled up to losers of R32 (Pos 17).
    // So everyone else is 33.

    // Determining the cutoff:
    let cutoff = 33;
    if (phases.length > 0) {
        // Phases count tells us depth. 
        // 1 phase (Final) -> Losers 2. Next 3.
        // 2 phases (Final, Semi) -> Losers 4. Next 5.
        // 3 phases (Final, Semi, QF) -> Losers 8. Next 9.
        // 4 phases (Final, Semi, QF, R16) -> Losers 16. Next 17.
        // 5 phases -> Losers 32. Next 33.
        cutoff = Math.pow(2, phases.length) + 1;
    }

    // Get all tournament players
    const allPlayersRes = await query('SELECT id FROM tournament_players WHERE tournament_id = $1', [tournamentId]);
    allPlayersRes.rows.forEach(p => {
        assign(p.id, cutoff); // Assign remaining
    });

    // 4. Save to DB
    for (const u of updates) {
        await query(`
            UPDATE tournament_players 
            SET final_position = $1, ranking_points = $2
            WHERE id = $3
        `, [u.pos, u.pts, u.pid]);
    }

    return updates.length;
}

/**
 * RECALCULATES THE GLOBAL RANKING from scratch.
 * Rules:
 * - A: >= 5 tournaments. Sum top 5.
 * - B: 3-4 tournaments. Sum all.
 * - C: < 3 tournaments. Sum all.
 * - Excludes tournaments with "prueba" (case insensitive).
 */
/**
 * RECALCULATES THE GLOBAL RANKING (National and Annual).
 * 
 * NATIONAL RANKING (Ranking Nacional):
 * - Scope: Last 12 months (Rolling Window).
 * - Logic:
 *   - A: >= 5 tournaments. Sum top 5.
 *   - B: 3-4 tournaments. Sum all.
 *   - C: < 3 tournaments. Sum all.
 * 
 * ANNUAL RANKING (Ranking Anual):
 * - Scope: Current Calendar Year (Jan 1st to Dec 31st).
 * - Logic: Cumulative Sum of ALL points.
 * 
 * Common Rules:
 * - Excludes tournaments with "prueba" (case insensitive).
 * - Only completed tournaments.
 */
export async function updateGlobalRanking() {
    // 0. Define Time Ranges
    const now = new Date();

    // National: Last 12 Months
    const nationalCutoff = new Date();
    nationalCutoff.setFullYear(now.getFullYear() - 1);

    // Annual: Jan 1st of Current Year
    const annualCutoff = new Date(now.getFullYear(), 0, 1); // Month 0 is Jan

    // 1. Get ALL valid scores with dates
    const scoresRes = await query(`
        SELECT tp.player_id, tp.ranking_points, t.start_date, t.name
        FROM tournament_players tp
        JOIN tournaments t ON tp.tournament_id = t.id
        WHERE tp.ranking_points > 0 
          AND t.status = 'completed'
          AND t.name NOT ILIKE '%prueba%'
    `);

    // 2. Process per player
    const players = {}; // { pid: { national: [], annual: [] } }

    scoresRes.rows.forEach(row => {
        if (!row.player_id) return;

        if (!players[row.player_id]) {
            players[row.player_id] = { nationalPoints: [], annualPoints: [] };
        }

        const date = new Date(row.start_date);

        // Check National Criteria
        if (date >= nationalCutoff) {
            players[row.player_id].nationalPoints.push(row.ranking_points);
        }

        // Check Annual Criteria
        if (date >= annualCutoff) {
            players[row.player_id].annualPoints.push(row.ranking_points);
        }
    });

    // 3. Calculate Results
    const updates = [];

    for (const [pid, data] of Object.entries(players)) {
        // --- NATIONAL CALCULATION ---
        // Sort DESC for Top N rule
        data.nationalPoints.sort((a, b) => b - a);

        const nationalPlayed = data.nationalPoints.length;
        let nationalCategory = 'C';
        let nationalScore = 0;

        if (nationalPlayed >= 5) {
            nationalCategory = 'A';
            // Top 5
            nationalScore = data.nationalPoints.slice(0, 5).reduce((a, b) => a + b, 0);
        } else if (nationalPlayed >= 3) {
            nationalCategory = 'B';
            // All
            nationalScore = data.nationalPoints.reduce((a, b) => a + b, 0);
        } else {
            nationalCategory = 'C';
            // All
            nationalScore = data.nationalPoints.reduce((a, b) => a + b, 0);
        }

        // --- ANNUAL CALCULATION ---
        const annualPlayed = data.annualPoints.length;
        // Sum All for Annual
        const annualScore = data.annualPoints.reduce((a, b) => a + b, 0);

        updates.push({
            pid,
            nationalScore, nationalCategory, nationalPlayed,
            annualScore, annualPlayed
        });
    }

    // 4. Update Database
    // Reset everyone first? Or just update those who played?
    // Ideally we'd reset 0 for those not in list, but that's heavy.
    // Let's assume active players list is covered. 
    // Optimization: We could set all to 0 first if we want to clean up old stats.
    // For now, let's just update calculated values.

    let count = 0;
    for (const u of updates) {
        await query(`
            UPDATE players 
            SET ranking = $1, category = $2, tournaments_played = $3,
                ranking_annual = $4, tournaments_played_annual = $5
            WHERE id = $6
        `, [
            u.nationalScore, u.nationalCategory, u.nationalPlayed,
            u.annualScore, u.annualPlayed,
            u.pid
        ]);
        count++;
    }

    return count;
}
