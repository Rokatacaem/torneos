
const { Pool } = require('pg');

const isLocal = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false },
});

async function checkTournament() {
    try {
        const tId = 34;
        console.log(`Checking Tournament ${tId}...`);

        // Check Phases
        const phases = await pool.query('SELECT * FROM tournament_phases WHERE tournament_id = $1', [tId]);
        console.log('Phases:', phases.rows.map(p => `${p.id}: ${p.name} (${p.type})`));

        // Check Matches
        const matches = await pool.query('SELECT count(*) as total, status, phase_id FROM matches WHERE tournament_id = $1 GROUP BY status, phase_id', [tId]);
        console.log('Matches Summary:', matches.rows);

        // Check if any matches exist at all
        const allMatches = await pool.query('SELECT id, player1_id, player2_id, score_p1, score_p2, status FROM matches WHERE tournament_id = $1 LIMIT 5', [tId]);
        console.log('Sample Matches:', allMatches.rows);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkTournament();
