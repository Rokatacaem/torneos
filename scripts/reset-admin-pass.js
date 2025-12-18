const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function resetAdmin() {
    const client = await pool.connect();
    try {
        console.log('--- RESETTING ADMIN PASSWORD (CORRECT SCHEMA) ---');
        const username = 'admin';
        const password = 'admin123';

        console.log('Hashing password...');
        const hash = await bcrypt.hash(password, 10);

        // Check if we use 'name' or 'email'. Introspection showed 'name'.
        // We will assume the login form 'username' maps to 'name' in DB.

        console.log('Updating user...');
        const res = await client.query(`
            UPDATE users 
            SET password_hash = $1 
            WHERE name = $2
            RETURNING id, name, role
        `, [hash, username]);

        if (res.rowCount > 0) {
            console.log('Success! Updated user:', res.rows[0]);
        } else {
            console.log('Error: User "admin" not found. Creating it...');
            // Insert using 'name'
            const insertRes = await client.query(`
                INSERT INTO users (name, password_hash, role)
                VALUES ($1, $2, $3)
                RETURNING id, name, role
            `, [username, hash, 'admin']);
            console.log('Created user:', insertRes.rows[0]);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

resetAdmin();
