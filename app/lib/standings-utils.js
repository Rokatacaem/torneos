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
    matches.forEach(match => {
        if (match.status !== 'completed') return;

        const group = match.group_name || 'General';
        const p1 = groups[group][match.player1_id];
        const p2 = groups[group][match.player2_id];

        if (p1 && p2) {
            if (match.win_reason !== 'wo') {
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

            if (match.winner_id === match.player1_id) {
                p1.won++;
                p1.points += 2;
                p2.lost++;
            } else if (match.winner_id === match.player2_id) {
                p2.won++;
                p1.lost++;
                p2.points += 2;
            } else {
                p2.points += 1;
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
            // E.g. in GSL: 2-0 (Played 2) > 2-1 (Played 3)
            if (a.played !== b.played) return a.played - b.played;

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

    matches.forEach(m => {
        // Init with handicap and team if available
        // Note: matches object keys depend on getMatches query. 
        // In getMatches, we select p1.team_name alias? No, we select p.* from tournament_players?
        // Let's check getMatches query below. It selects: 
        // p1.player_name, p1.handicap. It DOES NOT select team_name explicitly for p1/p2.
        // We need to fix getMatches first to return team_name.
        if (m.player1_id) initPlayer(m.player1_id, m.player1_name, m.player1_handicap, m.player1_team);
        if (m.player2_id) initPlayer(m.player2_id, m.player2_name, m.player2_handicap, m.player2_team);

        if (m.status === 'completed') {
            const p1 = players[m.player1_id];
            const p2 = players[m.player2_id];

            if (p1 && p2) {
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

                // Points
                if (m.winner_id === m.player1_id) {
                    p1.won++;
                    p1.points += 2; // Match points usually 2 in billiards tournaments
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
        return parseFloat(b.generalAvg) - parseFloat(a.generalAvg);
    });
}
