import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

console.log("Connection String Source:", process.env.DATABASE_URL ? "DATABASE_URL" : (process.env.POSTGRES_URL ? "POSTGRES_URL" : "NONE"));

const pool = new Pool({
    connectionString,
    ssl: connectionString?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log("Connecting to DB...");
        const client = await pool.connect();

        console.log("Adding columns if missing...");

        // start_player_id
        await client.query(`
            ALTER TABLE tournament_matches 
            ADD COLUMN IF NOT EXISTS start_player_id INT;
        `);
        console.log("- start_player_id checked/added");

        // current_player_id
        await client.query(`
            ALTER TABLE tournament_matches 
            ADD COLUMN IF NOT EXISTS current_player_id INT;
        `);
        console.log("- current_player_id checked/added");

        // referee_name
        await client.query(`
            ALTER TABLE tournament_matches 
            ADD COLUMN IF NOT EXISTS referee_name TEXT;
        `);
        console.log("- referee_name checked/added");

        client.release();
        console.log("Migration completed.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

migrate();
