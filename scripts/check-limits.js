const { query } = require('../app/lib/db');

async function check() {
    console.log('Checking Tournaments Limits...');
    const res = await query('SELECT id, name, group_points_limit, group_innings_limit FROM tournaments ORDER BY id DESC LIMIT 5');
    console.table(res.rows);
}

check();
