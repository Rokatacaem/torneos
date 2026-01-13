require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const isLocal = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false },
});

const query = async (text, params) => {
    try {
        return await pool.query(text, params);
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

async function main() {
    console.log('--- DEBUG GSL MATCHES ---');

    // 1. Get latest tournament
    const tRes = await query(`SELECT * FROM tournaments ORDER BY id DESC LIMIT 1`);
    if (tRes.rows.length === 0) {
        console.log('No tournaments found.');
        return;
    }
    const t = tRes.rows[0];
    console.log(`Tournament: ${t.id} - ${t.name}`);
    console.log(`Format: ${t.format}, Group Format: ${t.group_format}`);
    console.log(`Tables Available: ${t.tables_available}`);

    // 2. Get Matches
    const mRes = await query(`
        SELECT m.id, m.group_id, m.round_number, m.status, m.player1_id, m.player2_id, m.phase_id, m.winner_id, g.name as group_name
        FROM tournament_matches m
        LEFT JOIN tournament_groups g ON m.group_id = g.id
        WHERE m.tournament_id = $1
        ORDER BY m.group_id, m.id
    `, [t.id]);

    const matches = mRes.rows;
    console.log(`Total Matches: ${matches.length}`);

    // Group by Group ID
    const groups = {};
    matches.forEach(m => {
        const gid = m.group_id || 'playoff';
        if (!groups[gid]) groups[gid] = [];
        groups[gid].push(m);
    });

    const results = {
        tournament: { id: t.id, name: t.name, format: t.format, group_format: t.group_format },
        groups: {}
    };

    for (const gid in groups) {
        if (gid === 'playoff') continue;
        const gMs = groups[gid];
        const gName = gMs[0].group_name;
        // console.log(`\nGroup ${gName} (ID: ${gid}): ${gMs.length} matches`);
        results.groups[gName] = gMs.map(m => ({
            id: m.id,
            round: m.round_number,
            status: m.status,
            phase_id: m.phase_id,
            winner_id: m.winner_id,
            p1: m.player1_id,
            p2: m.player2_id
        }));
    }

    const fs = require('fs');
    fs.writeFileSync('debug_results.json', JSON.stringify(results, null, 2));
    console.log('Results written to debug_results.json');
    pool.end();
}

main().catch(console.error);
