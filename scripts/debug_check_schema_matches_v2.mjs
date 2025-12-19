import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.POSTGRES_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkSchema() {
    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tournament_matches';
        `);
        console.log("Columnas en tournament_matches:");
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });
        client.release();
    } catch (err) {
        console.error("Error consultando esquema:", err);
    } finally {
        await pool.end();
    }
}

checkSchema();
