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
        console.log('Reading official ranking data...');
        const rawData = fs.readFileSync('ranking_data.json', 'utf8');
        const jsonData = JSON.parse(rawData);

        // Normalize names for comparison (uppercase, trim)
        const validNames = new Set(jsonData.data.map(p => p.nombre.trim().toUpperCase()));
        console.log(`Loaded ${validNames.size} valid player names from JSON.`);

        console.log('Fetching players from database...');
        const res = await client.query('SELECT id, name, created_at FROM players');
        const dbPlayers = res.rows;
        console.log(`Found ${dbPlayers.length} players in database.`);

        const toDelete = [];
        const toKeep = [];

        dbPlayers.forEach(p => {
            const dbName = p.name.trim().toUpperCase();
            if (validNames.has(dbName)) {
                toKeep.push(p);
            } else {
                toDelete.push(p);
            }
        });

        console.log(`\nAuthorized players (Match found): ${toKeep.length}`);
        console.log(`Unauthorized players (No match): ${toDelete.length}`);

        if (toDelete.length > 0) {
            console.log('\n--- Players to be DELETED ---');
            let output = '--- Players to be DELETED ---\n';
            toDelete.forEach(p => {
                const line = `ID: ${p.id} | Name: ${p.name} | Created: ${p.created_at}`;
                console.log(line);
                output += line + '\n';
            });
            fs.writeFileSync('players_to_delete.txt', output, 'utf8');
            console.log('\nList saved to players_to_delete.txt');
        } else {
            console.log('\nNo unauthorized players found. Database matches JSON list.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
