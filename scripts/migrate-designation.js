const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('Migrating Database...');

        // 1. Create tournament_assignments table
        await client.query(`
            CREATE TABLE IF NOT EXISTS tournament_assignments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tournament_id, user_id)
            );
        `);
        console.log('Table tournament_assignments created.');

        // 2. Add discipline column to tournaments if not exists
        await client.query(`
            ALTER TABLE tournaments 
            ADD COLUMN IF NOT EXISTS discipline VARCHAR(100);
        `);
        console.log('Column discipline added to tournaments (if missing).');

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Error in migration:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
