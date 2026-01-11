require('dotenv').config({ path: '.env.local' });
const { query } = require('../app/lib/db');

async function checkMatches() {
    try {
        console.log('Checking matches for Tournament 34...');
        const res = await query(`
            SELECT id, 
                   player1_id, score_p1, 
                   player2_id, score_p2, 
                   status, winner_id 
            FROM tournament_matches 
            WHERE tournament_id = 34 
            AND (status = 'completed' OR score_p1 > 0 OR score_p2 > 0)
            LIMIT 10
        `);

        if (res.rows.length === 0) {
            console.log('No COMPLETED matches found (or with score > 0).');

            // Check ANY match to see if they exist
            const allRes = await query('SELECT count(*) FROM tournament_matches WHERE tournament_id = 34');
            console.log(`Total matches in DB for T34: ${allRes.rows[0].count}`);
        } else {
            console.log('Found completed matches:', res.rows);
        }
    } catch (e) {
        console.error(e);
    }
}

checkMatches();
