require('dotenv').config({ path: '.env' });
const { query } = require('../app/lib/db');

async function migrate() {
    try {
        console.log('Adding persistence columns to tournament_matches...');

        await query(`
            ALTER TABLE tournament_matches 
            ADD COLUMN IF NOT EXISTS start_player_id INTEGER REFERENCES tournament_players(id),
            ADD COLUMN IF NOT EXISTS current_player_id INTEGER REFERENCES tournament_players(id);
        `);

        console.log('Columns added successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

migrate();
