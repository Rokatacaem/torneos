const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('Searching for potential test players...');

        let output = '';

        const res = await client.query(`
            SELECT id, name, created_at 
            FROM players 
            WHERE name ILIKE '%test%' 
               OR name ILIKE '%prueba%' 
               OR name ILIKE '%demo%'
               OR name ILIKE '%fake%'
               OR name ILIKE '%ejemplo%'
            ORDER BY created_at DESC
        `);

        if (res.rows.length === 0) {
            console.log('No players found directly matching keywords.');
            const recent = await client.query('SELECT id, name, created_at FROM players ORDER BY created_at DESC LIMIT 20');

            output += '--- No direct keyword matches found. Listing recent players ---\n';
            recent.rows.forEach(row => {
                output += `ID: ${row.id} | Name: ${row.name} | Created: ${row.created_at}\n`;
            });
        } else {
            console.log('Found potential test players.');
            output += '--- Potential Test Players ---\n';
            res.rows.forEach(row => {
                output += `ID: ${row.id} | Name: ${row.name} | Created: ${row.created_at}\n`;
            });
        }

        fs.writeFileSync('players_output.txt', output, 'utf8');
        console.log('Results written to players_output.txt');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
