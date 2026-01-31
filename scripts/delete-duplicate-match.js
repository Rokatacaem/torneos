require('dotenv').config({ path: '.env.local' });
const { query } = require('../app/lib/db');

async function fix() {
    console.log("Deleting duplicate match 1692...");
    const res = await query(`DELETE FROM tournament_matches WHERE id = 1692 RETURNING *`);
    console.log("Deleted:", res.rows[0]);
    process.exit(0);
}
fix();
