require('dotenv').config({ path: '.env.local' });
const { query } = require('../app/lib/db');

async function fixWOScores() {
    console.log("Fixing WO match scores to 0...");

    // Find matches with win_reason 'wo' and non-zero score
    const res = await query(`
        UPDATE tournament_matches
        SET score_p1 = 0, score_p2 = 0
        WHERE win_reason = 'wo' AND (score_p1 > 0 OR score_p2 > 0)
        RETURNING id, score_p1, score_p2
    `);

    console.log(`Updated ${res.rowCount} matches.`);
    res.rows.forEach(r => {
        console.log(`- Match #${r.id} reset to 0-0`);
    });

    console.log("Done.");
    process.exit(0);
}

fixWOScores().catch(e => {
    console.error(e);
    process.exit(1);
});
