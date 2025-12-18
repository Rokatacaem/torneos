const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixAdmin() {
    const client = await pool.connect();
    try {
        console.log('--- FIXING ADMIN USER ---');

        // 1. Generate Query Hash
        const hash = await bcrypt.hash('admin123', 10);

        // 2. Update users with role 'admin'
        // This will rename 'Administrador' to 'admin' and set correct password.
        const res = await client.query(`
            UPDATE users 
            SET name = 'admin', password_hash = $1
            WHERE role = 'admin'
            RETURNING id, name, role
        `, [hash]);

        if (res.rowCount > 0) {
            console.log(`Updated ${res.rowCount} admin user(s).`);
            res.rows.forEach(u => console.log('Updated:', u));
        } else {
            console.log('No user with role=admin found. Creating one...');
            const insertRes = await client.query(`
                INSERT INTO users (name, role, password_hash)
                VALUES ('admin', 'admin', $1)
                RETURNING id, name, role
             `, [hash]);
            console.log('Created user:', insertRes.rows[0]);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

fixAdmin();
