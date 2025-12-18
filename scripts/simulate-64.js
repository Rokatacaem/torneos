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

if (!connectionString) {
    console.error("No connection string found!");
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

// --- NAMES ---
const NAMES = [
    "Alex", "Beto", "Carlos", "David", "Eduardo", "Felipe", "Gabriel", "Hugo",
    "Ivan", "Juan", "Kevin", "Luis", "Mario", "Nico", "Oscar", "Pablo",
    "Quintin", "Ricardo", "Sergio", "Tomas", "Ulises", "Victor", "Walter", "Xavier",
    "Yago", "Zacarias", "Antonio", "Bernardo", "Cesar", "Diego", "Esteban", "Federico",
    "Gustavo", "Hector", "Ignacio", "Javier", "Karim", "Lorenzo", "Manuel", "Nestor",
    "Oliver", "Patricio", "Quique", "Roberto", "Santiago", "Teo", "Uriel", "Valentin",
    "Wilmer", "Xavi", "Yair", "Zidane", "Andres", "Bruno", "Cristian", "Daniel",
    "Elias", "Fabian", "Gaston", "Hernan", "Ismael", "Jorge", "Kike", "Lucas",
    "Marcos", "Noe", "Omar", "Pedro", "Raul", "Sebastian", "Tito", "Vicente",
    "William", "Yuri", "Zack", "Abel", "Benjamin", "Camilo", "Dario", "Eliseo"
];

const LASTNAMES = [
    "Silva", "Santos", "Garcia", "Rodriguez", "Lopez", "Martinez", "Gonzalez", "Perez",
    "Sanchez", "Romero", "Sosa", "Torres", "Ruiz", "Diaz", "Dominguez", "Benitez",
    "Flores", "Acosta", "Rojas", "Medina", "Paz", "Cabrera", "Rios", "Vargas",
    "Castillo", "Luna", "Mendoza", "Cruz", "Guzman", "Espinoza", "Aguilar", "Ortiz"
];

function getRandomName() {
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const last = LASTNAMES[Math.floor(Math.random() * LASTNAMES.length)];
    return `${name} ${last}`;
}

async function runSimulation() {
    const client = await pool.connect();
    try {
        console.log('--- STARTING 64 PLAYER SIMULATION ---');

        // 1. Create Tournament
        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 3);
        const tourName = `Torneo Master 64 Finalizado`;

        console.log(`Creating tournament: ${tourName}`);

        const tRes = await client.query(`
            INSERT INTO tournaments (name, start_date, end_date, max_players, format, group_size, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'active')
            RETURNING id
        `, [tourName, start, end, 64, 'groups', 4]);

        const tournamentId = tRes.rows[0].id;
        console.log(`Tournament created. ID: ${tournamentId}`);

        // 2. Create 64 Players
        console.log('Creating 64 players...');
        const players = [];
        for (let i = 0; i < 64; i++) {
            const ranking = 2500 - (i * 20) + Math.floor(Math.random() * 50);
            const name = getRandomName();
            const club = `Club ${String.fromCharCode(65 + (i % 16))}`;

            let playerId = null;
            const existingPlayer = await client.query('SELECT id FROM players WHERE name = $1', [name]);
            if (existingPlayer.rows.length > 0) {
                playerId = existingPlayer.rows[0].id;
            } else {
                const newGlobal = await client.query(`
                    INSERT INTO players (name, current_club)
                    VALUES ($1, $2) RETURNING id
                `, [name, club]);
                playerId = newGlobal.rows[0].id;
            }

            const pRes = await client.query(`
                INSERT INTO tournament_players (tournament_id, player_name, team_name, handicap, ranking, player_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, player_name, ranking
            `, [tournamentId, name, club, Math.floor(Math.random() * 5), ranking, playerId]);

            players.push(pRes.rows[0]);
        }
        console.log('Players created.');

        // 3. Generate Groups
        console.log('Generating groups (Snake Seeding)...');
        const phaseRes = await client.query(`
            INSERT INTO tournament_phases (tournament_id, name, type, sequence_order)
            VALUES ($1, 'Fase de Grupos', 'group', 1)
            RETURNING id
        `, [tournamentId]);
        const phaseId = phaseRes.rows[0].id;

        const groupSize = 4;
        const groupCount = Math.ceil(players.length / groupSize); // Should be 16
        const seededPlayers = players.sort((a, b) => (b.ranking || 0) - (a.ranking || 0));

        const groups = [];
        for (let i = 0; i < groupCount; i++) {
            const gRes = await client.query(`
                INSERT INTO tournament_groups (phase_id, name)
                VALUES ($1, $2)
                RETURNING id, name
            `, [phaseId, `G${i + 1}`]);
            groups.push(gRes.rows[0]);
        }

        const groupAssignments = {};
        groups.forEach(g => groupAssignments[g.id] = []);
        seededPlayers.forEach((p, idx) => {
            const cycle = Math.floor(idx / groupCount);
            const isZigZag = cycle % 2 === 1;
            let targetGroupIdx = isZigZag ? (groupCount - 1) - (idx % groupCount) : idx % groupCount;
            groupAssignments[groups[targetGroupIdx].id].push(p.id);
        });

        // Create Matches
        let matchCount = 0;
        for (const g of groups) {
            const pIds = groupAssignments[g.id];
            for (let i = 0; i < pIds.length; i++) {
                for (let j = i + 1; j < pIds.length; j++) {
                    await client.query(`
                        INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status)
                        VALUES ($1, $2, $3, $4, $5, 'scheduled')
                    `, [tournamentId, phaseId, g.id, pIds[i], pIds[j]]);
                    matchCount++;
                }
            }
        }
        console.log(`Groups generated. Created ${matchCount} matches.`);

        // 4. Simulate ALL Matches
        console.log('Simulating results for 100% of matches...');
        const matchesRes = await client.query(`SELECT * FROM tournament_matches WHERE tournament_id = $1`, [tournamentId]);
        const matches = matchesRes.rows;

        for (const m of matches) {
            const p1Wins = Math.random() > 0.5;
            const s1 = p1Wins ? 15 : Math.floor(Math.random() * 12);
            const s2 = p1Wins ? Math.floor(Math.random() * 12) : 15;

            // Wait a tiny bit randomly to not stamp all at exact same ms (optional)

            await client.query(`
                UPDATE tournament_matches
                SET score_p1 = $1, score_p2 = $2, innings = $3, 
                    winner_id = $4, status = 'completed'
                WHERE id = $5
            `, [s1, s2, 10 + Math.floor(Math.random() * 10), p1Wins ? m.player1_id : m.player2_id, m.id]);
        }
        console.log(`Simulation complete.`);

    } catch (err) {
        console.error('Simulation failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

runSimulation();
