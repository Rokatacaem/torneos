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

        console.log('Fetching players from database...');
        const res = await client.query('SELECT id, name FROM players');
        const dbPlayers = res.rows;

        const toDeleteIds = [];
        dbPlayers.forEach(p => {
            const dbName = p.name.trim().toUpperCase();
            if (!validNames.has(dbName)) {
                toDeleteIds.push(p.id);
            }
        });

        console.log(`Found ${toDeleteIds.length} players to delete.`);

        if (toDeleteIds.length > 0) {
            console.log('Deleting players...');
            // Delete in batches or one by one. Using ANY for simplicity.
            const query = 'DELETE FROM players WHERE id::text = ANY($1::text[])';
            const result = await client.query(query, [toDeleteIds]);
            console.log(`Deleted ${result.rowCount} players.`);
        } else {
            console.log('No players to delete.');
        }

    } catch (err) {
        console.error('Error deleting players:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
