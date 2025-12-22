const { query } = require('../app/lib/db');

async function checkSchema() {
    console.log('--- Tournaments Columns ---');
    const tCols = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'tournaments';
    `);
    console.table(tCols.rows);

    console.log('--- Tournament Players Columns ---');
    const pCols = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'tournament_players';
    `);
    console.table(pCols.rows);
}

checkSchema();
