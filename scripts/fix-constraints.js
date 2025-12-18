const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('Fixing constraints...');
        await client.query('BEGIN');

        // 1. Find the constraint name for winner_id
        const res = await client.query(`
            SELECT constraint_name 
            FROM information_schema.key_column_usage 
            WHERE table_name = 'tournament_matches' AND column_name = 'winner_id'
        `);

        if (res.rows.length > 0) {
            const constraintName = res.rows[0].constraint_name;
            console.log(`Found constraint: ${constraintName}. Dropping...`);

            await client.query(`ALTER TABLE tournament_matches DROP CONSTRAINT "${constraintName}"`);

            console.log('Adding new constraint with ON DELETE SET NULL...');
            await client.query(`
                ALTER TABLE tournament_matches 
                ADD CONSTRAINT tournament_matches_winner_id_fkey 
                FOREIGN KEY (winner_id) REFERENCES tournament_players(id) ON DELETE SET NULL
            `);
        } else {
            console.log('Constraint not found? Creating it directly just in case.');
            await client.query(`
                ALTER TABLE tournament_matches 
                ADD CONSTRAINT tournament_matches_winner_id_fkey 
                FOREIGN KEY (winner_id) REFERENCES tournament_players(id) ON DELETE SET NULL
            `);
        }

        await client.query('COMMIT');
        console.log('Success!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
