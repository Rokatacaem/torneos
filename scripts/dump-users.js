const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function dumpUsers() {
    const client = await pool.connect();
    try {
        console.log('--- DUMP START ---');
        const res = await client.query('SELECT * FROM users');
        res.rows.forEach(u => {
            console.log(`ID: ${u.id}`);
            console.log(`Name: '${u.name}'`); // Quotes to reveal whitespace
            console.log(`Email: '${u.email}'`);
            console.log(`Role: '${u.role}'`);
            console.log(`Hash Length: ${u.password_hash ? u.password_hash.length : 'NULL'}`);
            console.log('---');
        });
        console.log('--- DUMP END ---');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

dumpUsers();
