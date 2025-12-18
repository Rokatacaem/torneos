const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Try load .env.local
try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
    }
} catch (e) {
    console.error('Error loading .env.local', e);
}

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set. Please set it in your environment or .env.local");
    process.exit(1);
}

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function initDB() {
    try {
        await client.connect();
        console.log('Connected to DB. Initializing schema...');

        await client.query('BEGIN');

        // 1. CLUBS
        console.log('- Creating table: clubs');
        await client.query(`
            CREATE TABLE IF NOT EXISTS clubs (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                address VARCHAR(255),
                tables_billar INTEGER DEFAULT 0,
                tables_pool INTEGER DEFAULT 0,
                tables_snooker INTEGER DEFAULT 0,
                tables_bola9 INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // 2. PLAYERS
        console.log('- Creating table: players');
        await client.query(`
            CREATE TABLE IF NOT EXISTS players (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                ranking INTEGER DEFAULT 0,
                ranking_annual INTEGER DEFAULT 0,
                average NUMERIC(5,3) DEFAULT 0,
                category VARCHAR(10) DEFAULT 'C',
                total_carambolas INTEGER DEFAULT 0,
                total_innings INTEGER DEFAULT 0,
                tournaments_played INTEGER DEFAULT 0,
                handicap INTEGER DEFAULT 0,
                club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
                photo_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // 3. USERS
        console.log('- Creating table: users');
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // 4. TOURNAMENT SYSTEM
        console.log('- Creating table: tournaments & matches');
        await client.query(`
            CREATE TABLE IF NOT EXISTS tournaments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP NOT NULL,
                max_players INTEGER,
                format VARCHAR(50),
                status VARCHAR(20) DEFAULT 'draft',
                playoff_target_size INTEGER,
                qualifiers_per_group INTEGER
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

            CREATE TABLE IF NOT EXISTS tournament_players (
                id SERIAL PRIMARY KEY,
                tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
                player_name VARCHAR(255) NOT NULL,
                team_name VARCHAR(255),
                handicap INTEGER DEFAULT 0,
                player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
                club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
                registration_status VARCHAR(50) DEFAULT 'confirmed'
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
                high_run_p2 INTEGER DEFAULT 0,
                start_time TIMESTAMP,
                end_time TIMESTAMP
            );
        `);

        await client.query('COMMIT');
        console.log('✅ Database initialized successfully.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Error initializing DB:', e);
    } finally {
        await client.end();
    }
}

initDB();
