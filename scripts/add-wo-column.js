require('dotenv').config({ path: '.env.local' });
const { query } = require('../app/lib/db');

async function run() {
    try {
        console.log('Checking for win_reason column...');
        const check = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tournament_matches' AND column_name = 'win_reason'
        `);

        if (check.rows.length === 0) {
            console.log('Adding win_reason column...');
            await query(`ALTER TABLE tournament_matches ADD COLUMN win_reason TEXT DEFAULT 'normal'`);
            console.log('Column added successfully.');
        } else {
            console.log('Column already exists.');
        }

        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

run();
