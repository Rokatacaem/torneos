const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const client = await pool.connect();

        // 1. Get latest tournament
        const tourRes = await client.query(`SELECT id, name, max_players, group_size FROM tournaments ORDER BY id DESC LIMIT 1`);
        if (tourRes.rows.length === 0) {
            console.log('No tournaments found.');
            return;
        }
        const tour = tourRes.rows[0];
        console.log('Latest Tournament:', tour);

        // 2. Count players by status
        const countRes = await client.query(`
            SELECT status, COUNT(*) 
            FROM tournament_players 
            WHERE tournament_id = $1 
            GROUP BY status
        `, [tour.id]);

        console.log('Player Counts by Status:');
        console.table(countRes.rows);

        // 3. List non-active players to verify
        const nonActive = await client.query(`
            SELECT id, player_name, status 
            FROM tournament_players 
            WHERE tournament_id = $1 AND status != 'active' AND status IS NOT NULL
            LIMIT 10
        `, [tour.id]);

        console.log('Sample Non-Active Players:', nonActive.rows);

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
