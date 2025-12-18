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
    ssl: { rejectUnauthorized: false }
});

async function simulate() {
    try {
        console.log('--- STARTING 32 PLAYER TOURNAMENT SIMULATION WITH CUSTOM IMAGES ---');

        // 1. Create Tournament
        console.log('Creating Tournament...');
        const createRes = await pool.query(`
            INSERT INTO tournaments (
                name, start_date, end_date, max_players, format, group_size, 
                shot_clock_seconds, group_points_limit, group_innings_limit, playoff_points_limit, playoff_innings_limit, 
                use_handicap, status,
                banner_image_url, logo_image_url,
                semifinal_points_limit, semifinal_innings_limit, final_points_limit, final_innings_limit
            )
            VALUES ($1, NOW(), NOW() + INTERVAL '3 days', 32, 'groups_elimination', 4, 
                40, 25, 20, 35, 30, 
                false, 'completed',
                '/tournaments/simulated-banner.png', '/tournaments/simulated-logo.png',
                40, 40, 50, 50
            ) 
            RETURNING id
        `, ['Copa Master 2025']);
        const tournamentId = createRes.rows[0].id;
        console.log(`Tournament Created: ID ${tournamentId}`);

        // 2. Register 32 Players
        console.log('Registering Players...');
        const playerNames = [
            "Diego Sánchez", "Javier Pérez", "Carlos Gómez", "Luis Martínez",
            "Miguel Rodríguez", "Juan Fernández", "Pedro López", "Andrés González",
            "José Hernández", "Antonio Díaz", "Manuel Ruiz", "Francisco Torres",
            "David Flores", "Jorge Ramírez", "Alberto Cruz", "Ricardo Morales",
            "Daniel Ortiz", "Eduardo Gutiérrez", "Roberto Castro", "Oscar Vargas",
            "Fernando Romero", "Hugo Navarro", "Gabriel Medina", "Alejandro Silva",
            "Sergio Mendoza", "Pablo Rojas", "Martín Soto", "Lucas Cabrera",
            "Enrique Espinoza", "Mario Guzmán", "Victor Campos", "Ramón Vega"
        ];

        const playerIds = [];
        for (const name of playerNames) {
            // Get/Create Global
            let pid;
            const check = await pool.query('SELECT id FROM players WHERE name = $1', [name]);
            if (check.rows.length > 0) {
                pid = check.rows[0].id;
            } else {
                const ins = await pool.query('INSERT INTO players (name) VALUES ($1) RETURNING id', [name]);
                pid = ins.rows[0].id;
            }

            // Register in Tournament
            const reg = await pool.query(`
                INSERT INTO tournament_players (tournament_id, player_id, player_name, handicap, ranking)
                VALUES ($1, $2, $3, 0, $4)
                RETURNING id
            `, [tournamentId, pid, name, Math.floor(Math.random() * 500) + 1000]);
            playerIds.push({ id: reg.rows[0].id, name });
        }

        // 3. Generate Groups (8 Groups of 4)
        console.log('Generating Groups...');
        const phaseRes = await pool.query(`INSERT INTO tournament_phases (tournament_id, name, type, sequence_order) VALUES ($1, 'Fase de Grupos', 'group', 1) RETURNING id`, [tournamentId]);
        const groupPhaseId = phaseRes.rows[0].id;

        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const groupIds = [];

        // Distribute players (Snake seed simplified)
        // Sort by 'ranking' (simulated by generic sort for now)
        // Just slice 4 by 4 for simplicity
        for (let i = 0; i < 8; i++) {
            const gRes = await pool.query(`INSERT INTO tournament_groups (phase_id, name) VALUES ($1, $2) RETURNING id`, [groupPhaseId, letters[i]]);
            const gid = gRes.rows[0].id;
            groupIds.push(gid);

            // Take 4 players
            const groupPlayers = playerIds.slice(i * 4, (i + 1) * 4);

            // Create Matches
            for (let a = 0; a < groupPlayers.length; a++) {
                for (let b = a + 1; b < groupPlayers.length; b++) {
                    // Simulate Result
                    const p1 = groupPlayers[a];
                    const p2 = groupPlayers[b];
                    const score1 = Math.floor(Math.random() * 25);
                    const score2 = Math.floor(Math.random() * 25);
                    // Someone must win or reach 25? Let's say one reaches 25
                    const p1Win = Math.random() > 0.5;
                    const s1 = p1Win ? 25 : score1;
                    const s2 = p1Win ? score2 : 25;

                    await pool.query(`
                        INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, score_p1, score_p2, innings, status, winner_id, high_run_p1, high_run_p2)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', $9, $10, $11)
                     `, [tournamentId, groupPhaseId, gid, p1.id, p2.id, s1, s2, Math.floor(Math.random() * 10) + 10, p1Win ? p1.id : p2.id, Math.floor(Math.random() * 8), Math.floor(Math.random() * 8)]);
                }
            }
        }

        // 4. Generate Playoffs (Round of 16 -> Final)
        console.log('Generating Playoffs...');
        // We select top 2 of each group (16 players total)
        // ...Skipping complex qualification logic, just picking first 2 of each slice for simulation speed
        let qualified = [];
        for (let i = 0; i < 8; i++) {
            qualified.push(playerIds[i * 4]);
            qualified.push(playerIds[i * 4 + 1]);
        }
        // Shuffle qualified for variety
        qualified = qualified.sort(() => Math.random() - 0.5);

        // Phases: 16vos (no, directly 8vos for 16 players), Quarters, Semis, Final
        const playoffStages = [
            { name: 'Octavos de Final', type: 'elimination', count: 8 },
            { name: 'Cuartos de Final', type: 'elimination', count: 4 },
            { name: 'Semifinal', type: 'elimination', count: 2 },
            { name: 'Gran Final', type: 'final', count: 1 }
        ];

        let currentRoundPlayers = qualified; // 16 players

        for (let stage of playoffStages) {
            const pRes = await pool.query(`INSERT INTO tournament_phases (tournament_id, name, type, sequence_order) VALUES ($1, $2, $3, $4) RETURNING id`, [tournamentId, stage.name, stage.type, (playoffStages.indexOf(stage) + 2)]);
            const pid = pRes.rows[0].id;

            const nextRoundPlayers = [];

            for (let i = 0; i < stage.count; i++) {
                const p1 = currentRoundPlayers[i * 2];
                const p2 = currentRoundPlayers[i * 2 + 1];

                // Sim result
                const limit = stage.type === 'final' ? 50 : (stage.name.includes('Semi') ? 40 : 35);
                const p1Win = Math.random() > 0.5;
                const s1 = p1Win ? limit : Math.floor(Math.random() * (limit - 5));
                const s2 = p1Win ? Math.floor(Math.random() * (limit - 5)) : limit;

                const winner = p1Win ? p1 : p2;
                nextRoundPlayers.push(winner);

                await pool.query(`
                    INSERT INTO tournament_matches (tournament_id, phase_id, player1_id, player2_id, score_p1, score_p2, innings, status, winner_id, high_run_p1, high_run_p2)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8, $9, $10)
                 `, [tournamentId, pid, p1.id, p2.id, s1, s2, Math.floor(Math.random() * 15) + 15, winner.id, Math.floor(Math.random() * 10) + 3, Math.floor(Math.random() * 10) + 3]);

                // Extra check for final to wait
                if (stage.type === 'final') {
                    console.log(`WINNER IS: ${winner.name}`);
                }
            }
            currentRoundPlayers = nextRoundPlayers;
        }

        console.log('--- SIMULATION COMPLETE ---');

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

simulate();
