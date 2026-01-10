const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 1. Setup DB Connection
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    try {
        const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
        const match = envFile.match(/DATABASE_URL=(.*)/);
        if (match) {
            connectionString = match[1].trim().replace(/^"|"$/g, '');
        }
    } catch (e) {
        console.warn('Could not read .env.local', e);
    }
}

const pool = new Pool({
    connectionString,
    ssl: false // Explicitly disable SSL for local dev if needed, or rely on connection string
});

async function verify(tournamentId) {
    const client = await pool.connect();
    try {
        console.log(`\n=== VERIFICATION FOR TOURNAMENT ID: ${tournamentId} ===\n`);

        // 1. Tournament Info
        const resTour = await client.query('SELECT * FROM tournaments WHERE id = $1', [tournamentId]);
        if (resTour.rows.length === 0) {
            console.log('Tournament not found.');
            return;
        }
        const t = resTour.rows[0];
        console.log(`[Tournament] ${t.name}`);
        console.log(`  Status: ${t.status}`);
        console.log(`  Format: ${t.format}`);
        console.log(`  Max Players: ${t.max_players}`);

        // 2. Players
        const resPlayers = await client.query('SELECT count(*) as c FROM tournament_players WHERE tournament_id = $1', [tournamentId]);
        console.log(`[Players] Total Registered: ${resPlayers.rows[0].c}`);

        // 3. Phases & Groups
        const resPhases = await client.query('SELECT * FROM tournament_phases WHERE tournament_id = $1 ORDER BY sequence_order', [tournamentId]);
        console.log(`\n[Phases] (${resPhases.rows.length})`);

        for (const phase of resPhases.rows) {
            console.log(`  - ${phase.name} (${phase.type})`);

            if (phase.type === 'group') {
                const resGroups = await client.query(`
                    SELECT g.name
                    FROM tournament_groups g
                    WHERE g.phase_id = $1 
                    ORDER BY g.name
                `, [phase.id]);
                resGroups.rows.forEach(g => {
                    console.log(`      Group ${g.name}`);
                });
            }

            // Matches in this phase
            const resMatches = await client.query(`
                SELECT count(*) as total, 
                       count(*) FILTER (WHERE status = 'completed') as completed
                FROM tournament_matches 
                WHERE phase_id = $1
            `, [phase.id]);
            const m = resMatches.rows[0];
            console.log(`      Matches: ${m.completed}/${m.total} completed`);
        }

        // 4. Champion
        const resChampion = await client.query(`
            SELECT m.winner_id, tp.player_name 
            FROM tournament_matches m
            JOIN tournament_players tp ON tp.id = m.winner_id
            JOIN tournament_phases ph ON ph.id = m.phase_id
            WHERE m.tournament_id = $1 AND ph.name = 'Gran Final'
        `, [tournamentId]);

        if (resChampion.rows.length > 0) {
            console.log(`\n[Champion] 🏆 ${resChampion.rows[0].player_name}`);
        } else {
            console.log('\n[Champion] Not yet decided');
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

const id = process.argv[2] || 29;
verify(id);
