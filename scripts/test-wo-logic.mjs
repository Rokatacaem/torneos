import { calculateGroupStandings, calculateGlobalStandings } from '../app/lib/standings-utils.js';

const mockMatches = [
    {
        id: 1, group_name: 'A', status: 'completed',
        player1_id: 1, player1_name: 'P1', player1_handicap: 1,
        player2_id: 2, player2_name: 'P2', player2_handicap: 1,
        score_p1: 20, score_p2: 10,
        innings: 10,
        winner_id: 1,
        win_reason: 'win'
    },
    {
        id: 2, group_name: 'A', status: 'completed',
        player1_id: 1, player1_name: 'P1', player1_handicap: 1,
        player2_id: 3, player2_name: 'P3', player2_handicap: 1,
        score_p1: 20, score_p2: 0,
        innings: 1,
        winner_id: 1,
        win_reason: 'wo' // Walkover
    }
];

// P1 Stats Expected:
// Match 1: 20 pts, 10 inns.
// Match 2: 20 pts (target), 0 inns (WO).
// Logic:
// Points: 2 (M1) + 2 (M2) = 4.
// ScoreFor: 20 (M1) + (0 from WO excluded) = 20.
// Innings: 10 (M1) + (0 from WO excluded) = 10.
// Avg: 20 / 10 = 2.000. 
// If WO counted: ScoreFor 40, Innings 10+1? or 10? Avg would be 4.0 or different.

console.log("Testing Group Standings...");
const groupRes = calculateGroupStandings(mockMatches);
const p1Group = groupRes['A'].find(p => p.id === 1);
console.log('P1 Group:', {
    played: p1Group.played,
    won: p1Group.won,
    points: p1Group.points,
    scoreFor: p1Group.scoreFor,
    innings: p1Group.innings,
    average: p1Group.average
});

if (p1Group.scoreFor !== 20 || p1Group.innings !== 10 || p1Group.played !== 1) {
    console.error("FAIL: Group stats included WO data incorrectly (Played count should be 1).", p1Group);
    process.exit(1);
}

console.log("Testing Global Standings...");
const globalRes = calculateGlobalStandings(mockMatches);
const p1Global = globalRes.find(p => p.id === 1);
console.log('P1 Global:', {
    played: p1Global.played,
    won: p1Global.won,
    points: p1Global.points,
    scoreFor: p1Global.scoreFor,
    innings: p1Global.innings,
    generalAvg: p1Global.generalAvg
});

if (p1Global.scoreFor !== 20 || p1Global.innings !== 10 || p1Global.played !== 1) {
    console.error("FAIL: Global stats included WO data incorrectly (Played count should be 1).", p1Global);
    process.exit(1);
}

console.log("SUCCESS: WO matches correctly excluded from averages.");
