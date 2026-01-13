import dotenv from 'dotenv';
import fs from 'fs';
import { query } from '../app/lib/db.js';

// Try loading various .env files
const envFiles = ['.env.local', '.env.development.local', '.env', '.env.development'];
let loaded = false;
for (const file of envFiles) {
    if (fs.existsSync(file)) {
        console.log(`Loading env from ${file}`);
        dotenv.config({ path: file });
        loaded = true;
    }
}

async function check() {
    console.log("Checking players table...");
    try {
        const countRes = await query('SELECT count(*) FROM players');
        console.log("Total players in DB:", countRes.rows[0].count);

        if (parseInt(countRes.rows[0].count) > 0) {
            const sample = await query('SELECT id, name FROM players LIMIT 5');
            console.log("Sample players:", sample.rows);

            // Test search
            const term = 'a'; // Should match most
            console.log(`Testing search with term '${term}'...`);
            const searchRes = await query(`
                SELECT p.id, p.name 
                FROM players p 
                WHERE p.name ILIKE $1 
                LIMIT 5
            `, [`%${term}%`]);
            console.log("Search matches:", searchRes.rows);
        } else {
            console.log("No players found in DB. That explains why search is empty!");
        }
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

check();
