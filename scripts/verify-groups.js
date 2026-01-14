const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const TOURNAMENT_ID = 33;

async function verify() {
    try {
        await client.connect();

        const gRes = await client.query(`
            SELECT COUNT(*) FROM tournament_groups 
            WHERE phase_id IN (SELECT id FROM tournament_phases WHERE tournament_id = $1)
        `, [TOURNAMENT_ID]);
        console.log('Groups count:', gRes.rows[0].count); // Expect 11

        const pRes = await client.query(`
            SELECT COUNT(*) FROM tournament_players 
            WHERE tournament_id = $1
        `, [TOURNAMENT_ID]);
        console.log('Players count:', pRes.rows[0].count); // Expect 44

        const mRes = await client.query(`
            SELECT COUNT(*) FROM tournament_matches 
            WHERE tournament_id = $1
        `, [TOURNAMENT_ID]);
        console.log('Matches count:', mRes.rows[0].count); // Expect 66

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

verify();
