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

const NAMES = [
    "Alex", "Beto", "Carlos", "David", "Eduardo", "Felipe", "Gabriel", "Hugo",
    "Ivan", "Juan", "Kevin", "Luis", "Mario", "Nico", "Oscar", "Pablo"
];
const LASTNAMES = [
    "Silva", "Santos", "Garcia", "Perez", "Romero", "Torres", "Ruiz", "Diaz"
];

function getRandomName() {
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const last = LASTNAMES[Math.floor(Math.random() * LASTNAMES.length)];
    return `${name} ${last}`;
}

async function runSeed() {
    const client = await pool.connect();
    try {
        console.log('--- STARTING FINISHED TOURNAMENT SEED ---');

        // 1. Create Tournament
        const start = new Date();
        start.setDate(start.getDate() - 5);
        const end = new Date();
        const suffix = new Date().toISOString().replace(/[-.T:]/g, '').slice(8, 14);
        const tourName = `Torneo Finalizado ${suffix}`;

        const tRes = await client.query(`
            INSERT INTO tournaments (name, start_date, end_date, max_players, format, group_size, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'completed')
            RETURNING id
        `, [tourName, start, end, 16, 'groups', 4]);

        const tournamentId = tRes.rows[0].id;
        console.log(`Tournament created: ${tourName} (ID: ${tournamentId})`);

        // 2. Create 16 Players
        console.log('Creating 16 players...');
        const players = [];
        for (let i = 0; i < 16; i++) {
            const ranking = 1500 - (i * 50) + Math.floor(Math.random() * 50);
            const name = getRandomName() + ` ${i}`;
            const club = `Club ${String.fromCharCode(65 + (i % 4))}`;

            // Global Player
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

        // 3. Generate 4 Groups (A, B, C, D)
        console.log('Generating groups...');
        const phaseRes = await client.query(`
            INSERT INTO tournament_phases (tournament_id, name, type, sequence_order)
            VALUES ($1, 'Fase de Grupos', 'group', 1)
            RETURNING id
        `, [tournamentId]);
        const groupPhaseId = phaseRes.rows[0].id;

        const groups = [];
        const letters = ['A', 'B', 'C', 'D'];
        for (let i = 0; i < 4; i++) {
            const gRes = await client.query(`
                INSERT INTO tournament_groups (phase_id, name)
                VALUES ($1, $2)
                RETURNING id, name
            `, [groupPhaseId, letters[i]]);
            groups.push({ ...gRes.rows[0], players: [] });
        }

        // Assign Players
        const seededPlayers = players.sort((a, b) => b.ranking - a.ranking);
        seededPlayers.forEach((p, idx) => {
            const cycle = Math.floor(idx / 4);
            const isZigZag = cycle % 2 === 1;
            let targetGroupIdx = isZigZag ? (3) - (idx % 4) : idx % 4;
            groups[targetGroupIdx].players.push(p);
        });

        // 4. Create and Play Group Matches
        console.log('Playing group matches...');
        for (const g of groups) {
            const pIds = g.players.map(p => p.id);
            for (let i = 0; i < pIds.length; i++) {
                for (let j = i + 1; j < pIds.length; j++) {
                    const p1Id = pIds[i];
                    const p2Id = pIds[j];
                    const p1Wins = Math.random() > 0.3;
                    const s1 = p1Wins ? 30 : 15 + Math.floor(Math.random() * 10);
                    const s2 = p1Wins ? 15 + Math.floor(Math.random() * 10) : 30;
                    const innings = 20 + Math.floor(Math.random() * 10);

                    await client.query(`
                        INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, score_p1, score_p2, innings, winner_id, status, referee_name, updated_at, round_label)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', 'Juez Simulado', NOW(), NULL)
                    `, [tournamentId, groupPhaseId, g.id, p1Id, p2Id, s1, s2, innings, p1Wins ? p1Id : p2Id]);
                }
            }
        }

        // 5. Playoffs - Quarterfinals
        console.log('Generating Playoffs...');

        const qfPhaseRes = await client.query(`
            INSERT INTO tournament_phases (tournament_id, name, type, sequence_order)
            VALUES ($1, 'Cuartos de Final', 'bracket', 2)
            RETURNING id
        `, [tournamentId]);
        const qfId = qfPhaseRes.rows[0].id;

        async function playMatch(phaseId, p1, p2, roundName) {
            const p1Wins = Math.random() > 0.4;
            const s1 = p1Wins ? 40 : 30;
            const s2 = p1Wins ? 30 : 40;
            const innings = 25;
            const winner = p1Wins ? p1 : p2;

            await client.query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, player1_id, player2_id, score_p1, score_p2, innings, winner_id, status, round_label, referee_name, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', $9, 'Juez Simulado', NOW())
            `, [tournamentId, phaseId, p1.id, p2.id, s1, s2, innings, winner.id, roundName]);

            return winner;
        }

        const qfWinners = [];
        qfWinners.push(await playMatch(qfId, groups[0].players[0], groups[1].players[1], 'Cuartos 1'));
        qfWinners.push(await playMatch(qfId, groups[1].players[0], groups[0].players[1], 'Cuartos 2'));
        qfWinners.push(await playMatch(qfId, groups[2].players[0], groups[3].players[1], 'Cuartos 3'));
        qfWinners.push(await playMatch(qfId, groups[3].players[0], groups[2].players[1], 'Cuartos 4'));

        // 6. Semifinals
        const sfPhaseRes = await client.query(`
            INSERT INTO tournament_phases (tournament_id, name, type, sequence_order)
            VALUES ($1, 'Semifinales', 'bracket', 3)
            RETURNING id
        `, [tournamentId]);
        const sfId = sfPhaseRes.rows[0].id;

        const sfWinners = [];
        sfWinners.push(await playMatch(sfId, qfWinners[0], qfWinners[2], 'Semifinal 1'));
        sfWinners.push(await playMatch(sfId, qfWinners[1], qfWinners[3], 'Semifinal 2'));

        // 7. Final
        const finalPhaseRes = await client.query(`
            INSERT INTO tournament_phases (tournament_id, name, type, sequence_order)
            VALUES ($1, 'Gran Final', 'bracket', 4)
            RETURNING id
        `, [tournamentId]);
        const finalId = finalPhaseRes.rows[0].id;

        const champion = await playMatch(finalId, sfWinners[0], sfWinners[1], 'Gran Final');

        console.log(`Tournament Finished! Champion: ${champion.player_name}`);
        console.log(`Details: /tournaments/${tournamentId}`);

    } catch (err) {
        console.error('Seed failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

runSeed();
