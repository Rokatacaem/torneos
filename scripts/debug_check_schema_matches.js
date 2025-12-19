const { query } = require('../app/lib/db');
require('dotenv').config({ path: '.env' });

async function checkSchema() {
    try {
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tournament_matches';
        `);
        console.log("Columnas en tournament_matches:");
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });
    } catch (err) {
        console.error("Error consultando esquema:", err);
    }
}

checkSchema();
