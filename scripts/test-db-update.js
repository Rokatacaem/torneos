const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testUpdate() {
    console.log('Connecting to:', process.env.DATABASE_URL ? 'URL present' : 'URL missing');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Testing update on match 587 (or latest)');

        // Find latest match
        const res = await pool.query('SELECT id FROM tournament_matches ORDER BY updated_at DESC LIMIT 1');
        if (res.rows.length === 0) {
            console.log('No matches found');
            return;
        }
        const matchId = res.rows[0].id;
        console.log('Match ID:', matchId);

        // Run Update Query Manually imitating updateMatchScore
        // Simulate sending High Run = 10
        const highRunP1 = 10;
        const p1Delta = 0;

        let queryStr = `
            UPDATE tournament_matches
            SET 
                score_p1 = GREATEST(0, COALESCE(score_p1, 0) + $2),
                high_run_p1 = GREATEST(COALESCE(high_run_p1, 0), $3),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;

        const updateRes = await pool.query(queryStr, [matchId, p1Delta, highRunP1]);
        console.log('Update Result High Run P1:', updateRes.rows[0].high_run_p1);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

testUpdate();
