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

async function updateSuperadmin() {
    const client = await pool.connect();
    try {
        const name = 'Rodrigo Zúñiga';
        const email = 'rokataca@gmail.com';
        const password = 'TaCaEmMi0929';
        const newUsername = 'rokataca'; // Assuming username is preferred for login, or we can use the name directly if the app uses name.
        // Based on previous checks, login uses 'name' column as username.
        // Let's set 'name' to 'Rodrigo Zúñiga' as requested. The login might expect the name.
        // Wait, the user said "El super adminis soy yo: Rodrigo Zúñiga". Maybe he wants the name to be that.
        // But usually login is shorter. Let's check `auth-actions.js`.
        // `const username = formData.get('username'); ... SELECT * FROM users WHERE name = $1`
        // So the "name" column IS the username. "Rodrigo Zúñiga" with spaces might be annoying to type.
        // But I will follow instructions. He provided Name, Password, Email.
        // I'll update the name to 'Rodrigo Zúñiga'.

        console.log(`Updating superadmin to: ${name}, ${email}`);
        const hash = await bcrypt.hash(password, 10);

        // Find existing superadmin to update
        const findRes = await client.query("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1");

        if (findRes.rows.length > 0) {
            const id = findRes.rows[0].id;
            await client.query(`
                UPDATE users
                SET name = $1, email = $2, password_hash = $3
                WHERE id = $4
            `, [name, email, hash, id]);
            console.log('Superadmin updated successfully.');
        } else {
            // Create if not exists
            await client.query(`
                INSERT INTO users (name, email, password_hash, role)
                VALUES ($1, $2, $3, 'superadmin')
            `, [name, email, hash]);
            console.log('Superadmin created successfully.');
        }

    } catch (e) { console.error(e); }
    finally {
        client.release();
        pool.end();
    }
}
updateSuperadmin();
