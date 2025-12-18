const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    try {
        const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
        const match = envFile.match(/DATABASE_URL=(.*)/);
        if (match) {
            connectionString = match[1].trim().replace(/^"|"$/g, '');
        }
    } catch (e) { }
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await pool.query('ALTER TABLE tournaments ADD COLUMN group_size INTEGER DEFAULT 4;');
        console.log('Columna group_size agregada exitosamente.');
    } catch (e) {
        if (e.message.includes('already exists')) {
            console.log('La columna ya existe.');
        } else {
            console.error('Error alterando tabla:', e.message);
        }
    } finally {
        pool.end();
    }
}
run();
