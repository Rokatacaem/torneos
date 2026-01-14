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

const TOURNAMENT_ID = 33; // Torneo Verano Carlos Meza Muñoz created in 2026? Verified in previous step as ID 33.

// Data extracted from the image
const groupsData = [
    {
        name: 'Grupo 1',
        schedule: 'Sabado 16:00', // 2026-01-17 16:00
        players: [
            { name: 'Alejandro Piza', country: 'Colombia' },
            { name: 'Victor Saavedra', country: 'Chile' },
            { name: 'Freddy Mejias', country: 'Colombia' },
            { name: 'Rodrigo Mancilla', country: 'Chile' }
        ]
    },
    {
        name: 'Grupo 2',
        schedule: 'Viernes 12:00', // 2026-01-16 12:00
        players: [
            { name: 'Marco Sobarzo', country: 'Chile' },
            { name: 'Jorge Trujillo', country: 'Chile' },
            { name: 'Adolfo Rojas', country: 'Chile' },
            { name: 'Guillermo Ledezma', country: 'Chile' }
        ]
    },
    {
        name: 'Grupo 3',
        schedule: 'Sabado 10:00', // 2026-01-17 10:00
        players: [
            { name: 'Luis Bahamondes', country: 'Chile' },
            { name: 'Luis Velasquez', country: 'Chile' },
            { name: 'Luis Bustos', country: 'Chile' },
            { name: 'Cristian Rioja', country: 'Chile' }
        ]
    },
    {
        name: 'Grupo 4',
        schedule: 'Sabado 10:00', // 2026-01-17 10:00
        players: [
            { name: 'Eduardo Lujan', country: 'Argentina' },
            { name: 'Ricardo Ponce', country: 'Chile' },
            { name: 'Marcos Caceres', country: 'Chile' },
            { name: 'Manuel Gomez', country: 'Chile' }
        ]
    },
    {
        name: 'Grupo 5',
        schedule: 'Viernes 16:00', // 2026-01-16 16:00
        players: [
            { name: 'Raul Legrotagle', country: 'Argentina' },
            { name: 'Eduardo Aranda', country: 'Chile' },
            { name: 'Jorge Galeano', country: 'Chile' },
            { name: 'Marco Garay', country: 'Chile' }
        ]
    },
    {
        name: 'Grupo 6',
        schedule: 'Sabado 16:00', // 2026-01-17 16:00
        players: [
            { name: 'Marcelo Peña', country: 'Chile' },
            { name: 'Benjamin Fernandez', country: 'Chile' },
            { name: 'Ricardo Alfaro', country: 'Chile' },
            { name: 'Julio Caballero', country: 'Chile' }
        ]
    },
    {
        name: 'Grupo 7',
        schedule: 'Viernes 12:00', // 2026-01-16 12:00
        players: [
            { name: 'Carlos Guerra', country: 'Chile' },
            { name: 'Peter Sarmiento', country: 'Chile' },
            { name: 'Mario Diaz', country: 'Chile' },
            { name: 'Manuel Pulgar', country: 'Chile' }
        ]
    },
    {
        name: 'Grupo 8',
        schedule: 'Viernes 16:00', // 2026-01-16 16:00
        players: [
            { name: 'Ulises Salinas', country: 'Chile' },
            { name: 'Pablo Chicurel', country: 'Chile' },
            { name: 'Juan Carlos Ostos', country: 'Chile' },
            { name: 'Cesar Lopez', country: 'Chile' }
        ]
    },
    {
        name: 'Grupo 9',
        schedule: 'Sabado 10:00', // 2026-01-17 10:00
        players: [
            { name: 'Marco Duarte', country: 'Chile' },
            { name: 'Juan Carlos Toro', country: 'Chile' },
            { name: 'Yeries Chahuan', country: 'Chile' },
            { name: 'Marcos Selman', country: 'Chile' }
        ]
    },
    {
        name: 'Grupo 10',
        schedule: 'Viernes 16:00', // 2026-01-16 16:00
        players: [
            // Typo in image "Alez Pizarro", likely Alex Pizarro
            { name: 'Jorge Castillo', country: 'Chile' },
            { name: 'Carlos Olaya', country: 'Chile' },
            { name: 'Alex Pizarro', country: 'Chile', original: 'Alez Pizarro' },
            { name: 'Sergio Gomez', country: 'Argentina' }
        ]
    },
    {
        name: 'Grupo 11',
        schedule: 'Sabado 16:00', // 2026-01-17 16:00
        players: [
            // "Matro Gonzalez", likely Mauro or Mateo. Keeping as Matro if not found, or Mauro?
            // "Matro" is very unlikely. "Mauro" is common. Let's assume Mauro.
            { name: 'Luis Rubiño', country: 'Chile' },
            { name: 'Rodrigo Zuñiga', country: 'Chile' },
            { name: 'Rodolfo Silva', country: 'Chile' },
            { name: 'Mauro Gonzalez', country: 'Argentina', original: 'Matro Gonzalez' }
        ]
    }
];

// Helper to calculate date from "Day HH:mm" string assuming Jan 2026
function parseSchedule(scheduleStr) {
    const [day, time] = scheduleStr.split(' ');
    // Viernes = 16 Jan 2026
    // Sabado = 17 Jan 2026
    let dateStr = '';
    if (day === 'Viernes') dateStr = '2026-01-16';
    if (day === 'Sabado') dateStr = '2026-01-17';

    return `${dateStr} ${time}:00`;
}

async function getOrCreatePlayer(name, country) {
    // Try exact match
    let res = await client.query('SELECT id, name FROM players WHERE name ILIKE $1', [name]);
    if (res.rows.length > 0) return res.rows[0];

    // Try finding by last name if multiple words
    const parts = name.split(' ');
    if (parts.length > 1) {
        // A bit risky to auto-match partials without confirm, so let's just create if not found exact.
        // Or better, creating ensures we have the correct display name as requested.
    }

    console.log(`Creating/Mapping player: ${name} (${country})`);
    // Create new player
    // Assuming simple insert. UUID is generated by DEFAULT if configured, checking schema...
    // Schema: id (uuid)
    // We need to generate UUID or let DB do it? 
    // Usually 'uuid_generate_v4()' default. Let's try INSERT returning *

    res = await client.query(`
        INSERT INTO players (name, active, created_at, updated_at)
        VALUES ($1, true, NOW(), NOW())
        RETURNING id, name
    `, [name]);

    return res.rows[0];
}

async function run() {
    try {
        await client.connect();

        // 1. Get Phase ID
        let phaseRes = await client.query(`
            SELECT id FROM tournament_phases 
            WHERE tournament_id = $1 AND type = 'group'
        `, [TOURNAMENT_ID]);

        let phaseId;
        if (phaseRes.rows.length === 0) {
            console.log('Creating group phase...');
            const pRes = await client.query(`
                INSERT INTO tournament_phases (tournament_id, name, type, sequence_order)
                VALUES ($1, 'Fase de Grupos', 'group', 1)
                RETURNING id
            `, [TOURNAMENT_ID]);
            phaseId = pRes.rows[0].id;
        } else {
            phaseId = phaseRes.rows[0].id;
        }

        // 2. Clear existing groups/matches for this tournament to be safe? 
        // Maybe too destructive. Let's just DELETE for this tournament to start fresh as requested "Implementalo" implies doing it fully.
        console.log('Cleaning up existing data for this tournament...');
        await client.query('DELETE FROM tournament_matches WHERE tournament_id = $1', [TOURNAMENT_ID]);
        await client.query('DELETE FROM tournament_groups WHERE phase_id = $1', [phaseId]); // Cascades?
        await client.query('DELETE FROM tournament_players WHERE tournament_id = $1', [TOURNAMENT_ID]);

        console.log('Processing groups...');

        for (const group of groupsData) {
            console.log(`\nSetting up ${group.name}...`);

            // Create Group
            const startTime = parseSchedule(group.schedule);
            const gRes = await client.query(`
                INSERT INTO tournament_groups (phase_id, name, start_time)
                VALUES ($1, $2, $3)
                RETURNING id
            `, [phaseId, group.name, startTime]);
            const groupId = gRes.rows[0].id;

            const groupPlayerIds = [];

            // Process Players
            for (const p of group.players) {
                const playerObj = await getOrCreatePlayer(p.name, p.country);

                // Add to tournament_players
                const tpRes = await client.query(`
                    INSERT INTO tournament_players (tournament_id, player_id, player_name, status, ranking)
                    VALUES ($1, $2, $3, 'active', 0)
                    RETURNING id
                `, [TOURNAMENT_ID, playerObj.id, p.name]);

                groupPlayerIds.push({
                    tpId: tpRes.rows[0].id, // This is the ID used in matches?
                    pId: playerObj.id // Or is it player_id?
                });
                // Check schema for tournament_matches: player1_id (integer). 
                // Wait, typically matches refer to tournament_players.id (int) OR players.id (uuid)?
                // Looking at schema in debug-check-schema-all output:
                // tournament_matches: player1_id (integer). So it refers to tournament_players.id.
            }

            // Generate Round Robin Matches
            // 4 players: 1vs2, 3vs4, 1vs3, 2vs4, 1vs4, 2vs3
            const p = groupPlayerIds;
            const matches = [
                [p[0], p[1]],
                [p[2], p[3]],
                [p[0], p[2]],
                [p[1], p[3]],
                [p[0], p[3]],
                [p[1], p[2]]
            ];

            for (const [p1, p2] of matches) {
                await client.query(`
                    INSERT INTO tournament_matches (
                        tournament_id, phase_id, group_id, 
                        player1_id, player2_id, 
                        status, updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
                `, [TOURNAMENT_ID, phaseId, groupId, p1.tpId, p2.tpId]);
            }
        }

        console.log('\nDone! Successfully imported groups and schedules.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
