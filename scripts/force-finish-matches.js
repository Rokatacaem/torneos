require('dotenv').config({ path: '.env.local' });
const { query } = require('../app/lib/db');

async function fixMatches(tournamentId) {
    try {
        console.log(`Analyzing matches for Tournament ${tournamentId}...`);

        // 1. Get Rules
        const tRes = await query('SELECT * FROM tournaments WHERE id = $1', [tournamentId]);
        if (tRes.rows.length === 0) throw new Error('Tournament not found');
        const t = tRes.rows[0];

        const POINTS_LIMIT = t.group_points_limit || 30;
        const INNINGS_LIMIT = t.group_innings_limit || 20;

        console.log(`Rules: ${POINTS_LIMIT} Pts / ${INNINGS_LIMIT} Innings`);

        // 2. Get stuck matches
        const mRes = await query(`
            SELECT * FROM tournament_matches 
            WHERE tournament_id = $1 
            AND status != 'completed'
            AND (score_p1 >= $2 OR score_p2 >= $2 OR innings >= $3)
        `, [tournamentId, POINTS_LIMIT, INNINGS_LIMIT]);

        console.log(`Found ${mRes.rows.length} matches potentially finished but not closed.`);

        for (const m of mRes.rows) {
            let winnerId = null;
            let reason = '';

            // Check Points
            if (m.score_p1 >= POINTS_LIMIT) {
                winnerId = m.player1_id;
                reason = 'Points Limit Reached';
            } else if (m.score_p2 >= POINTS_LIMIT) {
                winnerId = m.player2_id;
                reason = 'Points Limit Reached';
            }
            // Check Innings
            else if (m.innings >= INNINGS_LIMIT) {
                if (m.score_p1 > m.score_p2) winnerId = m.player1_id;
                else if (m.score_p2 > m.score_p1) winnerId = m.player2_id;
                else winnerId = null; // Draw? Or null
                reason = 'Innings Limit Reached';
            }

            if (winnerId || (m.innings >= INNINGS_LIMIT)) { // Allow draws if innings limit
                console.log(`Fixing Match ${m.id} (${m.score_p1}-${m.score_p2}). Winner: ${winnerId}. Reason: ${reason}`);

                await query(`
                    UPDATE tournament_matches 
                    SET status = 'completed', winner_id = $1
                    WHERE id = $2
                `, [winnerId, m.id]);
            }
        }

        console.log('Done.');

    } catch (e) {
        console.error(e);
    }
}

fixMatches(34);
