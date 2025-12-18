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

function formatName(rawName) {
    if (!rawName) return '';
    // Expected format "LASTNAME Firstname" or "LASTNAME Firstname Secondname"
    // We want "Firstname Secondname Lastname" or just "Firstname Lastname"
    // Let's assume the first word(s) in ALL CAPS is the surname?
    // Actually, in the JSON: "SOBARZO Marco", "BAHAMONDES Luis", "SALINAS D. Ulises"

    // Split by space
    const parts = rawName.trim().split(/\s+/);
    if (parts.length < 2) return rawName;

    // Heuristic: First token is surname?
    // "SOBARZO Marco" -> Surname: SOBARZO, Name: Marco
    // "SALINAS D. Ulises" -> Surname: SALINAS, Name: D. Ulises? Or SALINAS D.?

    // Let's try to detect the capitalization break?
    // Or just take the last part as the First Name if it's Title Case?
    // But "SALINAS D. Ulises" has "D."

    // Simplest approach: "LASTNAME Firstname"
    // Surname is everything until the first non-uppercase word? 
    // "SOBARZO Marco" -> S: SOBARZO (all caps), N: Marco
    // "SALINAS D. Ulises" -> S: SALINAS, D. (Title), Ulises (Title)?

    // Let's just swap the first word to the end?
    // "SOBARZO Marco" -> "Marco Sobarzo"
    // "BAHAMONDES Luis" -> "Luis Bahamondes"
    // "SALINAS D. Ulises" -> "D. Ulises Salinas" ?? Maybe "Ulises Salinas"?

    // Let's stick to: First token is LASTNAME. The rest is Firstname.
    // "SOBARZO Marco" -> First: Marco, Last: Sobarzo (Capitalized)

    const lastNameUpper = parts[0];
    const rest = parts.slice(1).join(' '); // "Marco", "D. Ulises"

    // Function to titlelists
    const toTitle = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

    const lastName = toTitle(lastNameUpper);

    return `${rest} ${lastName}`;
}

async function importRanking() {
    try {
        const jsonData = fs.readFileSync('ranking_data.json', 'utf8');
        const data = JSON.parse(jsonData).data;

        await client.connect();

        console.log(`Processing ${data.length} players...`);
        let added = 0;
        let updated = 0;

        for (const p of data) {
            const rawName = p.nombre;
            const formattedName = formatName(rawName);
            const ranking = parseInt(p.ranking);
            const average = parseFloat(p.promedio);
            const idExterno = p.idJugador; // Maybe store this? For now just matching by name.

            // Check if player exists by name (Loose match)
            // Try formatted name first
            let res = await client.query('SELECT id FROM players WHERE name ILIKE $1', [formattedName]);

            if (res.rows.length === 0) {
                // Try raw name just in case
                res = await client.query('SELECT id FROM players WHERE name ILIKE $1', [rawName]);
            }

            if (res.rows.length > 0) {
                // Update
                const pid = res.rows[0].id;
                await client.query('UPDATE players SET ranking = $1, average = $2 WHERE id = $3', [ranking, average, pid]);
                updated++;
            } else {
                // Insert
                await client.query('INSERT INTO players (name, ranking, average) VALUES ($1, $2, $3)', [formattedName, ranking, average]);
                added++;
            }
        }

        console.log(`Import Complete. Added: ${added}, Updated: ${updated}`);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

importRanking();
