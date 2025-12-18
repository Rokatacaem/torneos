const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('--- COMPLETING 64 PLAYER TOURNAMENT ---');

        // 1. Get Tournament
        const tRes = await client.query('SELECT * FROM tournaments ORDER BY id DESC LIMIT 1');
        const tournament = tRes.rows[0];
        console.log(`Processing Tournament: ${tournament.name} (ID: ${tournament.id})`);

        // 2. Get Group Matches & Calculate Standings
        const mRes = await client.query(`
            SELECT m.*, g.name as group_name
            FROM tournament_matches m
            JOIN tournament_groups g ON m.group_id = g.id
            WHERE m.tournament_id = $1 AND g.name IS NOT NULL
        `, [tournament.id]);
        const groupMatches = mRes.rows;

        // Simple Standings Logic
        const standings = {};
        groupMatches.forEach(m => {
            const g = m.group_name;
            if (!standings[g]) standings[g] = {};

            const update = (pid, points, diff) => {
                if (!standings[g][pid]) standings[g][pid] = { id: pid, points: 0, diff: 0 };
                standings[g][pid].points += points;
                standings[g][pid].diff += diff;
            };

            if (m.status === 'completed') {
                const s1 = m.score_p1;
                const s2 = m.score_p2;
                if (m.winner_id === m.player1_id) {
                    update(m.player1_id, 3, s1 - s2);
                    update(m.player2_id, 0, s2 - s1);
                } else {
                    update(m.player2_id, 3, s2 - s1);
                    update(m.player1_id, 0, s1 - s2);
                }
            }
        });

        // Get Top 2 per group
        const qualifiers = []; // { id, group, rank }
        const groups = Object.keys(standings).sort();

        for (const g of groups) {
            const players = Object.values(standings[g]).sort((a, b) => b.points - a.points || b.diff - a.diff);
            if (players[0]) qualifiers.push({ ...players[0], group: g, rank: 1 });
            if (players[1]) qualifiers.push({ ...players[1], group: g, rank: 2 });
        }

        console.log(`Qualifiers found: ${qualifiers.length} (Expected 32)`);
        if (qualifiers.length !== 32) {
            console.log("Not enough players/matches to proceed. Check simulation.");
            // return; // Let's try to proceed if we have enough? 
        }

        // 3. Create Phases & Matches
        const phases = [
            { name: '16vos de Final', count: 16 },
            { name: 'Octavos de Final', count: 8 },
            { name: 'Cuartos de Final', count: 4 },
            { name: 'Semifinal', count: 2 },
            { name: 'Final', count: 1 }
        ];

        let currentPlayers = qualifiers.map(q => q.id); // For simplicity, random pairing for now or standard bracket
        // Standard bracket: A1 vs B2, etc. Too complex for quick script. 
        // We will just pair them randomly from the pool for 32 -> 16 -> 8...

        for (const phase of phases) {
            console.log(`Simulating ${phase.name}...`);

            // Create Phase
            const pRes = await client.query(`
                INSERT INTO tournament_phases (tournament_id, name, type, sequence_order)
                VALUES ($1, $2, 'elimination', (SELECT COALESCE(MAX(sequence_order), 0) + 1 FROM tournament_phases WHERE tournament_id = $1))
                RETURNING id
            `, [tournament.id, phase.name]);
            const phaseId = pRes.rows[0].id;

            const nextRoundPlayers = [];

            for (let i = 0; i < phase.count; i++) {
                const p1 = currentPlayers[i * 2];
                const p2 = currentPlayers[i * 2 + 1];

                if (!p1 || !p2) break;

                // Create Match
                const mRes = await client.query(`
                    INSERT INTO tournament_matches (tournament_id, phase_id, player1_id, player2_id, status)
                    VALUES ($1, $2, $3, $4, 'scheduled')
                    RETURNING id
                `, [tournament.id, phaseId, p1, p2]);
                const matchId = mRes.rows[0].id;

                // Simulate Result
                const p1Wins = Math.random() > 0.5;
                const winnerId = p1Wins ? p1 : p2;
                const s1 = p1Wins ? 30 : Math.floor(Math.random() * 25);
                const s2 = p1Wins ? Math.floor(Math.random() * 25) : 30;

                await client.query(`
                    UPDATE tournament_matches
                    SET score_p1 = $1, score_p2 = $2, innings = $3, 
                        winner_id = $4, status = 'completed'
                    WHERE id = $5
                `, [s1, s2, 20, winnerId, matchId]);

                nextRoundPlayers.push(winnerId);
            }
            currentPlayers = nextRoundPlayers;
        }

        console.log(`Tournament Completed. Champion ID: ${currentPlayers[0]}`);

        // Update Tournament Status
        await client.query(`UPDATE tournaments SET status = 'completed' WHERE id = $1`, [tournament.id]);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
