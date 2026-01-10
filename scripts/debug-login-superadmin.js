const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    try {
        const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
        const match = envFile.match(/DATABASE_URL=(.*)/);
        if (match) connectionString = match[1].trim().replace(/^"|"$/g, '');
    } catch (e) { }
}
const pool = new Pool({ connectionString, ssl: connectionString && connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false });

async function debugUser() {
    const client = await pool.connect();
    try {
        // Search by email to be sure we find the right row
        const email = 'rokataca@gmail.com';
        const res = await client.query('SELECT * FROM users WHERE email = $1', [email]);

        if (res.rows.length === 0) {
            console.log(`No user found with email ${email}`);
            // Search by name just in case
            const res2 = await client.query('SELECT * FROM users WHERE name = $1', ['Rodrigo Zúñiga']);
            console.log('Searching by exact name "Rodrigo Zúñiga":', res2.rows.length > 0 ? 'Found' : 'Not Found');
            if (res2.rows.length > 0) console.log('User found by name:', res2.rows[0]);
        } else {
            const user = res.rows[0];
            console.log('User found by email:', {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                password_hash_prefix: user.password_hash ? user.password_hash.substring(0, 10) : 'null'
            });

            const passwordToTest = 'TaCaEmMi0929';
            const isMatch = await bcrypt.compare(passwordToTest, user.password_hash);
            console.log(`Testing password '${passwordToTest}': ${isMatch ? 'MATCH' : 'FAIL'}`);

            // Also test without spaces just in case? No, exact match.
        }

    } catch (e) { console.error(e); }
    finally {
        client.release();
        pool.end();
    }
}
debugUser();
