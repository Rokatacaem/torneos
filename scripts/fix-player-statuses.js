const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const client = await pool.connect();

        // 1. Get latest tournament
        const tourRes = await client.query(`SELECT id, max_players FROM tournaments ORDER BY id DESC LIMIT 1`);
        if (tourRes.rows.length === 0) return;
        const tour = tourRes.rows[0];
        console.log(`Tournament ${tour.id}: Max Players ${tour.max_players}`);

        if (!tour.max_players) {
            console.log('No max players limit set.');
            return;
        }

        // 2. Get all players ordered by registration (id) or ranking? 
        // Typically we want to keep the "best" or "first registered". 
        // Let's assume order by ID (registration order) to keep the first registered as active.
        const playersRes = await client.query(`
            SELECT id, player_name, status 
            FROM tournament_players 
            WHERE tournament_id = $1 
            ORDER BY id ASC
        `, [tour.id]);

        const players = playersRes.rows;
        const limit = tour.max_players;

        console.log(`Found ${players.length} players. Limit is ${limit}.`);

        // 3. Update statuses
        await client.query('BEGIN');

        for (let i = 0; i < players.length; i++) {
            const p = players[i];
            const shouldBeActive = i < limit;
            const newStatus = shouldBeActive ? 'active' : 'waitlist';

            if (p.status !== newStatus) {
                console.log(`Updating ${p.player_name} (${p.id}): ${p.status} -> ${newStatus}`);
                await client.query(`
                    UPDATE tournament_players 
                    SET status = $1 
                    WHERE id = $2
                `, [newStatus, p.id]);
            }
        }

        await client.query('COMMIT');
        console.log('Update complete.');

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
