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

const NATIONAL_FILE = 'ranking_national.json';
const ANNUAL_FILE = 'ranking_data.json';

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function parseName(rawName) {
    // rawName format expected: "SURNAME Name"
    // Heuristic: uppercase parts are surname(s), mixed/lower are first name(s).
    const parts = rawName.trim().split(/\s+/);
    const surnames = [];
    const names = [];

    parts.forEach(part => {
        if (part === part.toUpperCase() && part.length > 0 && /[A-Z]/.test(part)) {
            surnames.push(toTitleCase(part));
        } else {
            names.push(part);
        }
    });

    if (names.length === 0) {
        return toTitleCase(rawName);
    }

    return `${names.join(' ')} ${surnames.join(' ')}`;
}

async function mergeData() {
    try {
        await client.connect();

        let nationalData = { data: [] };
        let annualData = { data: [] };

        if (fs.existsSync(NATIONAL_FILE)) {
            nationalData = JSON.parse(fs.readFileSync(NATIONAL_FILE, 'utf8'));
            console.log(`Loaded National Data: ${nationalData.data.length} records`);
        } else {
            console.error('Missing National Data file');
        }

        if (fs.existsSync(ANNUAL_FILE)) {
            annualData = JSON.parse(fs.readFileSync(ANNUAL_FILE, 'utf8'));
            console.log(`Loaded Annual Data: ${annualData.data.length} records`);
        } else {
            console.error('Missing Annual Data file');
        }

        await client.query('BEGIN');

        // Strategy: Iterate National List as primary for "Existence". 
        // Then iterate Annual for "Points" updates.

        // 1. Process National (Global Stats)
        for (const p of nationalData.data) {
            const rawName = p.nombre;
            const properName = parseName(rawName);

            const ranking = parseInt(p.ranking) || 0; // National Rank
            const carambolas = parseInt(p.carambolas) || 0;
            const innings = parseInt(p.entradas) || 0;
            const average = parseFloat(p.promedio) || 0;
            const tournaments = parseInt(p.torneos) || 0;
            const handicap = parseInt(p.handicap) || 0;
            const category = p.clasificacion || 'C';

            // Find or Create
            let player = await findPlayer(properName, rawName);

            if (player) {
                // Update
                await client.query(`
                    UPDATE players 
                    SET ranking = $1, total_carambolas = $2, total_innings = $3, 
                        tournaments_played = $4, handicap = $5, average = $6, category = $7
                    WHERE id = $8
                `, [ranking, carambolas, innings, tournaments, handicap, average, category, player.id]);
            } else {
                // Create
                const res = await client.query(`
                    INSERT INTO players (name, ranking, total_carambolas, total_innings, tournaments_played, handicap, average, category)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id
                `, [properName, ranking, carambolas, innings, tournaments, handicap, average, category]);
                player = res.rows[0];
                console.log(`Created (National): ${properName}`);
            }
        }

        // 2. Process Annual (Points)
        for (const p of annualData.data) {
            const rawName = p.nombre;
            const properName = parseName(rawName);

            // Annual Specifics
            const points = parseInt(p.puntos) || 0;
            // Note: Annual file also has carambolas/innings but user said National is source for "Accumulated".
            // So we treat National as source of truth for totals, and Annual for 'ranking_annual' (points).

            let player = await findPlayer(properName, rawName);

            if (player) {
                await client.query(`UPDATE players SET ranking_annual = $1 WHERE id = $2`, [points, player.id]);
            } else {
                console.log(`Warning: Annual player not found in National list (creating): ${properName}`);
                await client.query(`
                    INSERT INTO players (name, ranking_annual)
                    VALUES ($1, $2)
                 `, [properName, points]);
                // Columns like ranking/totals default to 0
            }
        }

        await client.query('COMMIT');
        console.log('Import successful.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

async function findPlayer(properName, rawName) {
    // 1. Exact match proper
    let res = await client.query('SELECT * FROM players WHERE name ILIKE $1', [properName]);
    if (res.rows.length > 0) return res.rows[0];

    // 2. Exact match raw
    res = await client.query('SELECT * FROM players WHERE name ILIKE $1', [rawName]);
    if (res.rows.length > 0) return res.rows[0];

    // 3. Token-based match (Fuzzyish)
    // "Ulises Salinas D." vs "D. Ulises Salinas"
    // Split both by space, lowercase, remove dots. Check intersection.
    function cleanTokens(str) {
        return str.toLowerCase().replace(/\./g, '').split(/\s+/).filter(t => t.length > 0);
    }

    const targetTokens = cleanTokens(properName);
    if (targetTokens.length < 2) return null; // Too risky for single name

    // We can't query all players efficiently, but we can query by ANY of the tokens?
    // Better: Query by "tokens contains first name surname" or similar.
    // Let's just try ILIKE queries for the main tokens (Surname)

    // Simplest robust way: 
    // Get candidate list using ILIKE on the longest token (>3 chars)
    const significantToken = targetTokens.sort((a, b) => b.length - a.length)[0];
    if (significantToken && significantToken.length >= 3) {
        const potentialMatches = await client.query('SELECT * FROM players WHERE name ILIKE $1', [`%${significantToken}%`]);

        for (const candidate of potentialMatches.rows) {
            const candidateTokens = cleanTokens(candidate.name);

            // Check if ALL target tokens are present in candidate tokens (or vice versa?)
            // Or Jaccard index?
            // "Ulises", "Salinas", "D" vs "D", "Ulises", "Salinas" -> match 100%

            const intersect = targetTokens.filter(t => candidateTokens.includes(t));
            const coverage = intersect.length / Math.max(targetTokens.length, candidateTokens.length);

            if (coverage >= 0.8 || (intersect.length === targetTokens.length && intersect.length === candidateTokens.length)) {
                console.log(`Fuzzy Linked: '${properName}' -> '${candidate.name}'`);
                return candidate;
            }
        }
    }

    return null;
}

mergeData();
