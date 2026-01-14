const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const TOURNAMENT_ID = 33;

async function run() {
    try {
        await client.connect();

        // 1. Get Tournament Details
        const tRes = await client.query('SELECT * FROM tournaments WHERE id = $1', [TOURNAMENT_ID]);
        const tournament = tRes.rows[0];
        console.log('Tournament:', {
            id: tournament.id,
            name: tournament.name,
            max_players: tournament.max_players,
            status: tournament.status
        });

        // 2. Get Players
        const pRes = await client.query(`SELECT id, player_name, status FROM tournament_players WHERE tournament_id = $1`, [TOURNAMENT_ID]);
        const players = pRes.rows;

        const active = players.filter(p => p.status === 'active' || !p.status);
        const waitlist = players.filter(p => p.status === 'waitlist');

        console.log('--- ALL PLAYERS ---');
        players.forEach(p => {
            console.log(`${p.player_name} (ID: ${p.id}) - Status: ${p.status}`);
        });
        console.log('-------------------');

        const eliminated = players.filter(p => p.status === 'eliminated');
        const disqualified = players.filter(p => p.status === 'disqualified');

        console.log('Stats:', {
            total: players.length,
            active: active.length,
            waitlist: waitlist.length,
            eliminated: eliminated.length,
            disqualified: disqualified.length
        });

        // Global Search
        const globalRes = await client.query("SELECT * FROM players WHERE name ILIKE '%Aravena%' OR name ILIKE '%Benjamin Fernandez%'");
        console.log('\n--- GLOBAL PLAYERS FOUND ---');
        globalRes.rows.forEach(p => console.log(`Global: ${p.name} (UUID: ${p.id})`));
        console.log('----------------------------');

        const uuids = globalRes.rows.map(r => r.id);
        if (uuids.length > 0) {
            const tpCheck = await client.query(`SELECT * FROM tournament_players WHERE tournament_id = $1 AND player_id = ANY($2)`, [TOURNAMENT_ID, uuids]);
            console.log('--- TOURNAMENT PLAYERS LINKED ---');
            tpCheck.rows.forEach(p => console.log(`Linked: ${p.player_name} (ID: ${p.id}) - Status: ${p.status} - UUID: ${p.player_id}`));
            console.log('---------------------------------');
        }

        // 3. Simulation Logic matches removePlayer code
        const max = tournament.max_players;
        const currentActive = active.length;

        console.log(`\nSimulation:`);
        console.log(`Max Players: ${max}`);
        console.log(`Current Active: ${currentActive}`);

        console.log(`\nSimulation:`);
        console.log(`Max Players: ${max}`);
        console.log(`Current Active: ${currentActive}`);

        if (max && currentActive < max) {
            console.log('✅ Condition (activeCount < max_players) is TRUE.');

            // Find oldest waitlist
            const waitlistRes = await client.query(`
                SELECT * FROM tournament_players 
                WHERE tournament_id = $1 AND status = 'waitlist'
                ORDER BY id ASC 
                LIMIT 1
            `, [TOURNAMENT_ID]);

            if (waitlistRes.rows.length > 0) {
                console.log(`👉 Would promote: ${waitlistRes.rows[0].player_name} (${waitlistRes.rows[0].id})`);
            } else {
                console.log('❌ No players in waitlist to promote.');
            }

        } else {
            console.log('❌ Condition (activeCount < max_players) is FALSE.');
            if (!max) console.log('   Reason: max_players is null or 0.');
            else console.log(`   Reason: Active count (${currentActive}) is NOT less than Max (${max}).`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
