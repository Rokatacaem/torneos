const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function debugLogin() {
    const client = await pool.connect();
    try {
        console.log('--- DEBUGGING LOGIN (NAME COLUMN) ---');
        const username = 'admin';
        const passwordToCheck = 'admin123';

        // 1. Fetch User
        console.log(`Fetching user by name: ${username}`);
        const res = await client.query('SELECT * FROM users WHERE name = $1', [username]);

        if (res.rows.length === 0) {
            console.log('User not found!');
            return;
        }

        const user = res.rows[0];
        console.log('User found:', { id: user.id, name: user.name, role: user.role, hasHash: !!user.password_hash });

        // 2. Check password_hash existence
        if (!user.password_hash) {
            console.error('CRITICAL: user.password_hash is missing or empty!');
        } else {
            console.log('password_hash exists, length:', user.password_hash.length);
        }

        // 3. Verify Password
        console.log(`Verifying password '${passwordToCheck}' against hash...`);
        try {
            const match = await bcrypt.compare(passwordToCheck, user.password_hash);
            console.log('Password match result:', match);
        } catch (bcryptError) {
            console.error('Bcrypt Error:', bcryptError);
        }

    } catch (err) {
        console.error('General Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

debugLogin();
