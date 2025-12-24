require('dotenv').config({ path: '.env.local' });
const { query } = require('../app/lib/db');

async function checkColumns() {
    try {
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tournaments';
        `);
        console.log('Columns in tournaments table:');
        res.rows.forEach(r => console.log(`- ${r.column_name} (${r.data_type})`));
    } catch (e) {
        console.error(e);
    }
}

checkColumns();
