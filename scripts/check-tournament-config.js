const { query } = require('../app/lib/db');

async function check() {
    console.log('Checking Tournaments Shot Clock Config...');
    const res = await query('SELECT id, name, shot_clock_seconds FROM tournaments ORDER BY id DESC LIMIT 5');
    console.table(res.rows);
}

check();
