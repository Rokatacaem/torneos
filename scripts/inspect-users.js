const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspect() {
    const client = await pool.connect();
    try {
        console.log('--- INSPECTING USERS TABLE ---');
        const res = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users';
        `);
        res.rows.forEach(row => {
            console.log(`Column: ${row.column_name}, Type: ${row.data_type}`);
        });
    } catch (err) {
        console.error('Error inspecting:', err);
    } finally {
        client.release();
        pool.end();
    }
}

inspect();
