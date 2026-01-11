const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function patch() {
    try {
        console.log('Patching High Run inputs...');

        // Update P1
        const res1 = await pool.query(`
            UPDATE tournament_matches
            SET high_run_p1 = 1
            WHERE score_p1 > 0 AND (high_run_p1 IS NULL OR high_run_p1 = 0)
        `);
        console.log(`Updated ${res1.rowCount} matches for P1.`);

        // Update P2
        const res2 = await pool.query(`
            UPDATE tournament_matches
            SET high_run_p2 = 1
            WHERE score_p2 > 0 AND (high_run_p2 IS NULL OR high_run_p2 = 0)
        `);
        console.log(`Updated ${res2.rowCount} matches for P2.`);

        // Also ensure updated_at is touched to trigger revalidations if needed?
        // Maybe not necessary as revalidation relies on on-demand fetch mostly.

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

patch();
