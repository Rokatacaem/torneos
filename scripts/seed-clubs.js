const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) { }

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const clubsToSeed = [
    "Club Santiago",
    "Club Valparaiso",
    "Club San Miguel",
    "Propool",
    "Club La Calera",
    "Club Juan Aracena",
    "Club Coquimbo"
];

async function seedClubs() {
    try {
        await client.connect();

        console.log('Seeding clubs...');
        for (const clubName of clubsToSeed) {
            // Check if exists
            const check = await client.query('SELECT id FROM clubs WHERE name ILIKE $1', [clubName]);
            if (check.rows.length === 0) {
                await client.query('INSERT INTO clubs (name) VALUES ($1)', [clubName]);
                console.log(`Added: ${clubName}`);
            } else {
                console.log(`Exists: ${clubName}`);
            }
        }
        console.log('Done.');

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

seedClubs();
