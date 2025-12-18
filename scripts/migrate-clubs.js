const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env
try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) { console.log('No .env.local'); }

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        await client.connect();
        console.log('Connected.');

        // 1. Create Clubs Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS clubs (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                short_name VARCHAR(50),
                logo_url TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Clubs table created.');

        // 2. Add club_id to players
        await client.query(`
            ALTER TABLE players 
            ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id);
        `);
        console.log('players.club_id column added.');

        // 3. Extract unique clubs from players.current_club
        const res = await client.query(`SELECT DISTINCT current_club FROM players WHERE current_club IS NOT NULL AND current_club != ''`);
        const distinctClubs = res.rows.map(r => r.current_club);

        console.log(`Found ${distinctClubs.length} unique clubs to migrate.`);

        for (const clubName of distinctClubs) {
            // Create club
            const insertRes = await client.query(`
                INSERT INTO clubs (name, short_name)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
                RETURNING id;
            `, [clubName, clubName.substring(0, 3).toUpperCase()]);

            // If inserted or already exists (we need ID if conflict could return nothing, but name isn't unique constraint usually unless we set it)
            // Let's just select it to be safe
            const clubRes = await client.query(`SELECT id FROM clubs WHERE name = $1`, [clubName]);
            const clubId = clubRes.rows[0].id;

            // Update players
            await client.query(`UPDATE players SET club_id = $1 WHERE current_club = $2`, [clubId, clubName]);
        }
        console.log('Migration complete.');

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

migrate();
