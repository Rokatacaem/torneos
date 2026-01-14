const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.log('No .env.local file found or error reading it, relying on process.env');
}

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findTournament() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const res = await client.query(`
      SELECT id, name, status, start_date
      FROM tournaments 
      WHERE name ILIKE '%Carlos Meza%'
    `);

        if (res.rows.length === 0) {
            console.log('No tournament found');
        } else {
            console.log('Tournament found:', res.rows[0]);
        }

        // Check for a sample of players to verify existence and spelling
        const samplePlayers = [
            'Alejandro Piza', 'Victor Saavedra', 'Freddy Mejias', 'Rodrigo Mancilla', // G1
            'Marco Sobarzo', 'Jorge Trujillo', 'Adolfo Rojas', // G2
            'Luis Bahamondes', // G3
            'Eduardo Lujan', // G4
            'Raul Legrotagle', // G5 (Check spelling)
            'Alez Pizarro' // G10 (Check spelling)
        ];

        console.log('\nChecking sample players:');
        for (const p of samplePlayers) {
            // Simple fuzzy match or just ilike
            const pRes = await client.query(`SELECT id, name FROM players WHERE name ILIKE $1`, [`%${p}%`]);
            if (pRes.rows.length > 0) {
                console.log(`FOUND ${p} -> ${pRes.rows[0].name} (${pRes.rows[0].id})`);
            } else {
                console.log(`MISSING ${p}`);
            }
        }

        // Check if tournament has any existing groups
        if (res.rows.length > 0) {
            const tId = res.rows[0].id;
            const gRes = await client.query(`SELECT * FROM tournament_groups WHERE tournament_id = $1`, [tId]); // Wait, tournament_groups doesn't have tournament_id, it links via phase?
            // Let's check schema again. tournament_groups: id, phase_id, name...
            // tournament_phases: id, tournament_id...

            const phasesRes = await client.query(`SELECT id, name, type FROM tournament_phases WHERE tournament_id = $1`, [tId]);
            console.log('\nPhases:', phasesRes.rows);

            if (phasesRes.rows.length > 0) {
                const phaseIds = phasesRes.rows.map(r => r.id);
                const groupsRes = await client.query(`SELECT * FROM tournament_groups WHERE phase_id = ANY($1::int[])`, [phaseIds]);
                console.log('Existing Groups:', groupsRes.rows.length);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

findTournament();
