const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function checkPhases() {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Asumiendo que el ID del torneo es 35 (según URL del screenshot)
        const tournamentId = 35;
        console.log(`Checking phases for tournament ${tournamentId}...`);

        const res = await client.query(`
            SELECT id, name, type, sequence_order 
            FROM tournament_phases 
            WHERE tournament_id = $1 
            ORDER BY sequence_order ASC
        `, [tournamentId]);

        console.log('Phases found:', res.rows);

        const matchesRes = await client.query(`
            SELECT id, phase_id, status 
            FROM tournament_matches 
            WHERE tournament_id = $1
        `, [tournamentId]);

        console.log(`Total matches: ${matchesRes.rows.length}`);

    } catch (error) {
        console.error('Check failed:', error);
    } finally {
        await client.end();
    }
}

checkPhases();
