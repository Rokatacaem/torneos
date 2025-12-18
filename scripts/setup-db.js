const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
    ssl: { rejectUnauthorized: false } // Adding SSL just in case for Neon
});

async function setup() {
    const client = await pool.connect();
    try {
        console.log('Creating tables...');

        await client.query(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        max_players INTEGER,
        format VARCHAR(50),
        status VARCHAR(20) DEFAULT 'draft'
      );

      CREATE TABLE IF NOT EXISTS tournament_players (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        player_name VARCHAR(255) NOT NULL,
        team_name VARCHAR(255),
        handicap INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS tournament_phases (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        sequence_order INTEGER
      );

      CREATE TABLE IF NOT EXISTS tournament_groups (
        id SERIAL PRIMARY KEY,
        phase_id INTEGER REFERENCES tournament_phases(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tournament_matches (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        phase_id INTEGER REFERENCES tournament_phases(id) ON DELETE CASCADE,
        group_id INTEGER REFERENCES tournament_groups(id) ON DELETE SET NULL,
        player1_id INTEGER REFERENCES tournament_players(id) ON DELETE CASCADE,
        player2_id INTEGER REFERENCES tournament_players(id) ON DELETE CASCADE,
        score_p1 INTEGER DEFAULT 0,
        score_p2 INTEGER DEFAULT 0,
        winner_id INTEGER REFERENCES tournament_players(id),
        status VARCHAR(20) DEFAULT 'scheduled',
        table_number INTEGER,
        innings INTEGER DEFAULT 0,
        high_run_p1 INTEGER DEFAULT 0,
        high_run_p2 INTEGER DEFAULT 0
      );
    `);

        console.log('Tables created successfully.');
    } catch (err) {
        console.error('Error setting up DB:', err);
    } finally {
        client.release();
        pool.end();
    }
}

setup();
