const { query } = require('../app/lib/db'); // Adjust path if running not from root, but usually better to duplicate db logic for scripts
const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
} catch (e) {
    console.error(e);
}

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        console.log('Testing getActiveTournaments query...');
        const res1 = await client.query(`
            SELECT DISTINCT t.id, t.name, t.start_date, t.end_date, t.logo_image_url
            FROM tournaments t
            JOIN tournament_matches m ON t.id = m.tournament_id
            WHERE m.status IN ('scheduled', 'in_progress')
            ORDER BY t.start_date DESC
        `);
        console.log(`✅ Success. Found ${res1.rowCount} active tournaments.`);

        if (res1.rowCount > 0) {
            const tId = res1.rows[0].id;
            console.log(`Testing getActiveMatches query for tournament ${tId}...`);
            const res2 = await client.query(`
                SELECT m.*, 
                    p1.player_name as player1_name, 
                    p2.player_name as player2_name,
                    g.name as group_name,
                    ph.name as phase_name,
                    ph.type as phase_type,
                    t.group_points_limit,
                    t.playoff_points_limit,
                    t.group_innings_limit,
                    t.playoff_innings_limit,
                    t.format,
                    t.name as tournament_name
                FROM tournament_matches m
                JOIN tournaments t ON m.tournament_id = t.id
                JOIN tournament_phases ph ON m.phase_id = ph.id
                LEFT JOIN tournament_groups g ON m.group_id = g.id
                LEFT JOIN tournament_players p1 ON m.player1_id = p1.id
                LEFT JOIN tournament_players p2 ON m.player2_id = p2.id
                WHERE m.status IN ('scheduled', 'in_progress')
                AND m.tournament_id = $1
                ORDER BY m.updated_at DESC, m.id DESC
            `, [tId]);
            console.log(`✅ Success. Found ${res2.rowCount} matches.`);
        } else {
            console.log('Skill testing getActiveMatches (no active tournaments found to use ID).');
        }

    } catch (e) {
        console.error('❌ Error executing queries:', e);
    } finally {
        await client.end();
    }
}

run();
