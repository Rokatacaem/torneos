const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    const client = await pool.connect();
    try {
        console.log('--- SEEDING TOURNAMENT PLAYERS ---');

        // 1. Find or Create Tournament
        const tourName = 'Verano 2026 - Club Santiago';
        let res = await client.query('SELECT * FROM tournaments WHERE name = $1', [tourName]);
        let tournament;

        if (res.rows.length === 0) {
            console.log(`Creating tournament '${tourName}'...`);
            res = await client.query(`
        INSERT INTO tournaments (
          name, start_date, end_date, max_players, format, group_size, status, block_duration
        ) VALUES (
          $1, NOW() + INTERVAL '1 day', NOW() + INTERVAL '3 days', 32, 'groups_knockout', 4, 'open', 240
        ) RETURNING *
      `, [tourName]);
        }
        tournament = res.rows[0];
        console.log(`Tournament ID: ${tournament.id}, Max Players: ${tournament.max_players}, Current Status: ${tournament.status}`);

        // If max_players is null, set it to 32 for test
        if (!tournament.max_players) {
            await client.query('UPDATE tournaments SET max_players = 32 WHERE id = $1', [tournament.id]);
            tournament.max_players = 32;
        }

        // 2. Count current players
        const countRes = await client.query('SELECT COUNT(*) FROM tournament_players WHERE tournament_id = $1', [tournament.id]);
        const currentCount = parseInt(countRes.rows[0].count);
        console.log(`Current players: ${currentCount}`);

        // 3. Calculate needed players
        // We want to fill max_players + 10 waitlist
        const targetCount = tournament.max_players + 10;
        const needed = targetCount - currentCount;

        if (needed <= 0) {
            console.log('Already enough players.');
            return;
        }

        console.log(`Generating ${needed} players...`);

        const givenNames = ['Juan', 'Pedro', 'Luis', 'Carlos', 'Andres', 'Felipe', 'Diego', 'Jose', 'Miguel', 'Pablo', 'Matias', 'Nicolas', 'Javier', 'Francisco', 'Roberto', 'Ricardo', 'Daniel', 'Eduardo', 'Gabriel', 'Alejandro'];
        const surnames = ['Gonzalez', 'Munoz', 'Rojas', 'Diaz', 'Perez', 'Soto', 'Contreras', 'Silva', 'Martinez', 'Sepulveda', 'Morales', 'Rodriguez', 'Lopez', 'Fuentes', 'Hernandez', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela'];

        // Helper to get random item
        const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

        for (let i = 0; i < needed; i++) {
            const name = `${rnd(givenNames)} ${rnd(surnames)} ${Math.floor(Math.random() * 1000)}`;
            // Determine status
            // We need to re-check "active" count to decide status, but simply:
            // if i + currentCount < max -> active
            // else -> waitlist

            // Actually, let's use the logic:
            const isWaitlist = (currentCount + i) >= tournament.max_players;
            const status = isWaitlist ? 'waitlist' : 'active';

            // Create Global Player first (optional, but good for consistency)
            // Check if exists? Meh, just insert raw into tournament_players for speed or do proper link?
            // Let's do proper link to avoid issues.

            // Using "random" ID for global player not needed, assume new
            const globalRes = await client.query(`
            INSERT INTO players (name) VALUES ($1) RETURNING id
        `, [name]);
            const pid = globalRes.rows[0].id;

            await client.query(`
            INSERT INTO tournament_players (tournament_id, player_name, player_id, status, handicap, team_name)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [tournament.id, name, pid, status, Math.floor(Math.random() * 10), isWaitlist ? 'Waitlist Team' : 'Active Team']);

            if (i % 5 === 0) process.stdout.write('.');
        }
        console.log('\nDone.');

    } catch (err) {
        console.error('Error seeding:', err);
    } finally {
        client.release();
        pool.end();
    }
}

seed();
