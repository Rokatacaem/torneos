const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
    const client = await pool.connect();
    try {
        console.log('--- CREATING ADMIN USER ---');

        // 1. Check if admin exists
        const res = await client.query('SELECT * FROM users WHERE username = $1', ['admin']);

        if (res.rows.length > 0) {
            console.log('Admin user already exists.');
            // Optionally update password if needed, but for now just skip
            // If you want to force reset:
            // const hash = await bcrypt.hash('admin', 10);
            // await client.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, 'admin']);
            // console.log('Admin password reset to "admin"');
        } else {
            console.log('Creating admin user...');
            const hash = await bcrypt.hash('admin', 10);
            await client.query(`
                INSERT INTO users (username, password_hash, role)
                VALUES ($1, $2, $3)
            `, ['admin', hash, 'admin']);
            console.log('Admin user created with password "admin".');
        }

    } catch (err) {
        console.error('Error creating admin:', err);
    } finally {
        client.release();
        pool.end();
    }
}

createAdmin();
