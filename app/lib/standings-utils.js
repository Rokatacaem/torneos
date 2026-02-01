export function calculateGroupStandings(matches) {
    const groups = {};

    // 1. Initialize logic
    matches.forEach(match => {
        const group = match.group_name || 'General';
        if (!groups[group]) groups[group] = {};

        // Helper to init player
        const initPlayer = (id, name, handicap) => {
            if (!groups[group][id]) {
                groups[group][id] = {
                    id,
                    name,
                    handicap: handicap || 0,
                    played: 0,
                    won: 0,
                    lost: 0,
                    points: 0,
                    scoreFor: 0,
                    scoreAgainst: 0,
                    highRun: 0
                };
            }
        };

        if (match.player1_id) initPlayer(match.player1_id, match.player1_name, match.player1_handicap);
        if (match.player2_id) initPlayer(match.player2_id, match.player2_name, match.player2_handicap);
    });

    // 2. Process results
    // Helper to detect unique pairs and count matches between them
    const pairMatches = {};

    // 2. Process results
    // Sort matches first to ensure order processing! Important for "First Match = Points, Second = No Points"
    // Assuming m.id or m.table_number indicates order. 
    // Matches should be sorted by sequence logic ideally. 
    // As per getMatches they come sorted by sequence_order, group, table_number. 
    // Let's rely on array order.

    matches.forEach(match => {
        if (match.status !== 'completed') return;

        const group = match.group_name || 'General';
        const p1 = groups[group][match.player1_id];
        const p2 = groups[group][match.player2_id];

        if (p1 && p2) {
            // Check if this pair has played before in this group
            // Sort IDs to ensure consistency (p1-p2 vs p2-p1)
            const pairKey = [match.player1_id, match.player2_id].sort().join('-');
            if (!pairMatches[group]) pairMatches[group] = {};

            // Count occurrence of this pair
            const matchIndex = (pairMatches[group][pairKey] || 0) + 1;
            pairMatches[group][pairKey] = matchIndex;

            const isReturnMatch = matchIndex > 1;

            if (match.win_reason !== 'wo') {
                // Average stats ALWAYS count (p1.played, p1.scoreFor, etc)
                // "The second match between them counts for average" - User
                p1.played++;
                p2.played++;
                p1.scoreFor += match.score_p1;
                p1.scoreAgainst += match.score_p2;
                p2.scoreFor += match.score_p2;
                p2.scoreAgainst += match.score_p1;

                const matchInnings = match.innings || 0;
                p1.innings = (p1.innings || 0) + matchInnings;
                p2.innings = (p2.innings || 0) + matchInnings;

                // Track High Run (SM)
                if (match.high_run_p1 > (p1.highRun || 0)) p1.highRun = match.high_run_p1;
                if (match.high_run_p2 > (p2.highRun || 0)) p2.highRun = match.high_run_p2;
            }

            // Points Logic
            // "The second match between them... does not count the 2 points"
            if (!isReturnMatch) {
                if (match.winner_id === match.player1_id) {
                    p1.won++;
                    p1.points += 2;
                    p2.lost++;
                } else if (match.winner_id === match.player2_id) {
                    p2.won++;
                    p2.points += 2;
                    p1.lost++;
                } else {
                    p1.points += 1;
                    p2.points += 1;
                }
            } else {
                // Return Match Logic: No Points. 
                // Win/Loss counters? 
                // "First match determines winner of group" (ranking wise)
                // "Second match counts for average but not points"
                // Do we increment won/lost counters? 
                // Usually Played/Won/Lost/Points are coupled. 
                // If we increment Won but give 0 points, it looks weird (1 played, 1 won, 0 pts).
                // But user says "solo se contabiliza para promedio".
                // I will NOT increment Won/Lost for return match to keep Points/Record consistent, 
                // BUT I WILL increment Played (done in average stats block above).

                // Wait, if I increment Played but not Won/Lost/Points.
                // Won + Lost + Draw should equal Played?
                // If I have 2 Played, 1 Won (First match), 0 Lost. Where did the second match go?
                // This might confuse the user or the table ("PJ 2, PG 1, PP 0").
                // However, user specifically said "Max points to reach is 4".
                // If I give points, I break that.
                // If I assume this is a 'friendly' for stats, maybe keep Won/Lost out of it?
                // Let's stick to strict interpretation: Points = 0.
                // Ideally, maybe Won/Lost shouldn't change either to avoid confusing the standing table.

                // DECISION: Only increment Played (for average calc) and Score/Innings.
                // Do NOT increment Won/Lost/Points.
            }
        }
    });

    // 3. Convert to sorted array
    const sortedGroups = {};
    Object.keys(groups).forEach(groupKey => {
        sortedGroups[groupKey] = Object.values(groups[groupKey]).map(p => {
            const inns = p.innings || 0;
            p.average = inns > 0 ? (p.scoreFor / inns).toFixed(3) : '0.000';

            // Weighted Average (Promedio Ponderado) = Score / (Handicap * Played)
            // If accumulated handicap is needed: Handicap * Played matches.
            // Assuming p.handicap is the single match handicap.
            const totalHandicap = (p.handicap || 0) * (p.played || 0);
            p.weightedAvg = totalHandicap > 0 ? (p.scoreFor / totalHandicap).toFixed(3) : '0.000';

            return p;
        }).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;

            // Prioritize Undefeated (Fewer matches played for same points = better efficiency)
            if (a.played !== b.played) return a.played - b.played;

            // New Tie-Breaker: Weighted Average (Percentage Performance)
            // Since matches are won by POTE, groups should be sorted by POTE.
            const pondA = parseFloat(a.weightedAvg || 0);
            const pondB = parseFloat(b.weightedAvg || 0);
            if (pondA !== pondB) return pondB - pondA;

            if ((b.scoreFor - b.scoreAgainst) !== (a.scoreFor - a.scoreAgainst))
                return (b.scoreFor - b.scoreAgainst) - (a.scoreFor - a.scoreAgainst);

            // Final Tie-Breaker (Initial Seeding): Sort by Handicap Descending
            if (b.handicap !== a.handicap) return b.handicap - a.handicap;

            return b.scoreFor - a.scoreFor;
        });
    });

    return sortedGroups;
}

/**
 * Calculates global standings with advanced stats (P, C, E, SM, Ha, PP, PG).
 */
export function calculateGlobalStandings(matches) {
    const players = {};

    // Helper
    const initPlayer = (id, name, handicap, club) => {
        if (!players[id]) {
            players[id] = {
                id,
                name,
                handicap: handicap || 0,
                club: club || '', // Default empty, populated if data available
                played: 0,
                won: 0,
                lost: 0,
                points: 0,
                scoreFor: 0, // Carambolas (C)
                scoreAgainst: 0,
                innings: 0, // Entradas (E)
                bestAvg: 0, // PP
                highRun: 0, // SM (Mock/Calc)
                maxPhaseOrder: 0, // To track progress
                phases: []
            };
        }
    };

    // Track unique matches per group for point restriction
    const globalPairMatches = {};

    matches.forEach(m => {
        // Init with handicap and team if available
        if (m.player1_id) initPlayer(m.player1_id, m.player1_name, m.player1_handicap, m.player1_team);
        if (m.player2_id) initPlayer(m.player2_id, m.player2_name, m.player2_handicap, m.player2_team);

        if (m.status === 'completed') {
            const p1 = players[m.player1_id];
            const p2 = players[m.player2_id];

            if (p1 && p2) {
                // Determine if this is a "Return Match" in groups (0 points)
                let isReturnMatch = false;
                if (m.phase_type === 'group' && m.group_name) {
                    const pairKey = `${m.group_name}-${[m.player1_id, m.player2_id].sort().join('-')}`;
                    const count = (globalPairMatches[pairKey] || 0) + 1;
                    globalPairMatches[pairKey] = count;
                    if (count > 1) isReturnMatch = true;
                }

                // Basic Stats
                if (m.win_reason !== 'wo') {
                    p1.played++; p2.played++;
                    p1.scoreFor += m.score_p1;
                    p1.scoreAgainst += m.score_p2;
                    p2.scoreFor += m.score_p2;
                    p2.scoreAgainst += m.score_p1;

                    const innings = m.innings || 1; // Avoid div by 0
                    p1.innings += innings;
                    p2.innings += innings;

                    // Logic for PP (Best Particular Average)
                    const p1Avg = m.score_p1 / innings;
                    const p2Avg = m.score_p2 / innings;
                    if (p1Avg > p1.bestAvg) p1.bestAvg = p1Avg;
                    if (p2Avg > p2.bestAvg) p2.bestAvg = p2Avg;

                    // Logic for SM (High Run - Actual data)
                    const p1Run = m.high_run_p1 || 0;
                    const p2Run = m.high_run_p2 || 0;
                    if (p1Run > p1.highRun) p1.highRun = p1Run;
                    if (p2Run > p2.highRun) p2.highRun = p2Run;
                }

                // Points - Only if NOT return match
                if (!isReturnMatch) {
                    if (m.winner_id === m.player1_id) {
                        p1.won++;
                        p1.points += 2;
                        p2.lost++;
                    } else if (m.winner_id === m.player2_id) {
                        p2.won++;
                        p2.points += 2;
                        p1.lost++;
                    } else {
                        p1.points += 1;
                        p2.points += 1;
                    }
                }
            }
        }
    });

    return Object.values(players).map(p => {
        p.generalAvg = p.innings > 0 ? (p.scoreFor / p.innings).toFixed(3) : '0.000';

        const totalHandicap = (p.handicap || 0) * (p.played || 0);
        p.weightedAvg = totalHandicap > 0 ? (p.scoreFor / totalHandicap).toFixed(3) : '0.000';

        p.particularAvg = p.bestAvg.toFixed(3);
        // Use real club if available, else derive check
        p.clubCode = p.club ? p.club.substring(0, 3).toUpperCase() : p.name.substring(0, 3).toUpperCase();
        if (p.clubCode.length < 3) p.clubCode = "CLB";
        return p;
    }).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return parseFloat(b.weightedAvg) - parseFloat(a.weightedAvg);
    });
}
