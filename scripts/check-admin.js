const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkAdmin() {
    const client = await pool.connect();
    try {
        console.log('--- CHECKING ADMIN USER ---');
        const res = await client.query('SELECT id, username, role, password_hash FROM users WHERE username = $1', ['admin']);
        if (res.rows.length > 0) {
            console.log('Admin user found:', res.rows[0]);
        } else {
            console.log('Admin user NOT found.');
        }
    } catch (err) {
        console.error('Error checking admin:', err);
    } finally {
        client.release();
        pool.end();
    }
}

checkAdmin();
