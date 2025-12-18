const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
try {
    dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
} catch (e) {
    console.error('Error loading .env.local', e);
}

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const JSON_FILE = 'ranking_data.json';

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function parseName(rawName) {
    // rawName format expected: "SURNAME Name" or "SURNAME SURNAME Name Name"
    // Heuristic: uppercase parts are surname(s), mixed/lower are first name(s).

    const parts = rawName.trim().split(/\s+/);
    const surnames = [];
    const names = [];

    parts.forEach(part => {
        // Check if fully uppercase (and length > 1 to avoid initials like J. or allow D.)
        // Actually, some might be "D." which is uppercase.
        // Let's assume the list starts with surnames.
        // And switches to names at the first title-cased word?

        // Simpler approach: 
        // Iterate. If matches all-uppercase (ignoring punctuation), add to surname.
        // Else add to name.
        // Exception: "DE LA" might be lowercase or mixed.

        // Let's look at data: "SOBARZO Marco", "SALINAS D. Ulises", "DECEBAL Jorge"
        // It seems consistent: Surname (Caps) Firstname (Title)

        if (part === part.toUpperCase() && part.length > 0 && /[A-Z]/.test(part)) {
            surnames.push(toTitleCase(part));
        } else {
            names.push(part); // Already title case usually, or mixed
        }
    });

    if (names.length === 0) {
        // Fallback: If all caps, take last word as name?
        // e.g. "ROJAS OSVALDO"
        return toTitleCase(rawName); // Just title case everything same order
    }

    return `${names.join(' ')} ${surnames.join(' ')}`;
}

async function importData() {
    try {
        const rawData = fs.readFileSync(JSON_FILE, 'utf8');
        const json = JSON.parse(rawData);
        const playersData = json.data;

        await client.connect();
        console.log(`Connected. Processing ${playersData.length} records...`);

        await client.query('BEGIN');

        let updated = 0;
        let created = 0;

        for (const p of playersData) {
            const rawName = p.nombre;
            const points = parseInt(p.puntos) || 0;
            const ranking = parseInt(p.ranking) || 0; // Position
            const category = p.clasificacion || 'C';
            const average = parseFloat(p.promedio) || 0; // Might use later?

            // Parse Name
            // Try normalized match
            const properName = parseName(rawName);

            // Try to find player
            // Strategy: 
            // 1. Exact match (case insensitive) on 'properName'
            // 2. Token match (if order swapped)

            let player = null;

            // Check 1: Direct Match
            const resExact = await client.query('SELECT * FROM players WHERE name ILIKE $1', [properName]);

            if (resExact.rows.length > 0) {
                player = resExact.rows[0];
            } else {
                // Check 2: Try reverse order? "Surname Name"
                // Or just try "Name Surname" vs "Surname Name" in DB?
                // Also check if rawName matches (case insensitive)
                const resRaw = await client.query('SELECT * FROM players WHERE name ILIKE $1', [rawName]);
                if (resRaw.rows.length > 0) {
                    player = resRaw.rows[0];
                }
            }

            if (player) {
                // Update
                await client.query(`
                    UPDATE players 
                    SET ranking_annual = $1, category = $2 
                    WHERE id = $3
                `, [points, category, player.id]);
                updated++;
                // console.log(`Updated: ${properName} (${points} pts)`);
            } else {
                // Create
                // Use 'ranking' (position) as national ranking? 
                // Wait, if it's "Ranking Nacional Anual", maybe 'ranking' field IS the national ranking position?
                // The existing DB has 'ranking' column.
                // Let's populate it too.

                await client.query(`
                    INSERT INTO players (name, ranking, ranking_annual, category, average)
                    VALUES ($1, $2, $3, $4, $5)
                `, [properName, ranking, points, category, average]);
                created++;
                console.log(`Created: ${properName} (#${ranking}, ${points} pts)`);
            }
        }

        await client.query('COMMIT');
        console.log(`Done. Updated: ${updated}, Created: ${created}`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

importData();
