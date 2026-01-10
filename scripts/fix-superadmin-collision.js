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

async function fixCollision() {
    const client = await pool.connect();
    try {
        console.log('--- FIXING COLLISION ---');

        // 1. Delete redundant users or user with conflicting email if it's not the one we want to keep
        // We want to keep the one that corresponds to 'Rodrigo Zúñiga' if possible, or just the one with 'rokataca' username if that's what he uses.
        // He uses 'Rodrigo Zúñiga' as USERNAME in the login form.
        // So we should setup a user with name = 'Rodrigo Zúñiga' and email = 'rokataca@gmail.com'.

        const targetName = 'Rodrigo Zúñiga';
        const targetEmail = 'rokataca@gmail.com';
        const targetPassword = 'TaCaEmMi0929';
        const hash = await bcrypt.hash(targetPassword, 10);

        // Delete 'Admin Demo' (superadmin) - we will replace it or update another user
        await client.query("DELETE FROM users WHERE name = 'Admin Demo'");
        console.log("Deleted 'Admin Demo'");

        // Check if there is a 'rokataca' user (admin)
        const rokatacaRes = await client.query("SELECT id FROM users WHERE name = 'rokataca'");
        if (rokatacaRes.rows.length > 0) {
            console.log("Updating 'rokataca' user to be the new superadmin...");
            await client.query(`
                UPDATE users 
                SET name = $1, email = $2, password_hash = $3, role = 'superadmin'
                WHERE id = $4
            `, [targetName, targetEmail, hash, rokatacaRes.rows[0].id]);
            console.log("Updated 'rokataca' -> 'Rodrigo Zúñiga' (Superadmin)");
        } else {
            console.log("User 'rokataca' not found. Creating new superadmin...");
            await client.query(`
                INSERT INTO users (name, email, password_hash, role)
                VALUES ($1, $2, $3, 'superadmin')
            `, [targetName, targetEmail, hash]);
            console.log("Created 'Rodrigo Zúñiga' (Superadmin)");
        }

    } catch (e) { console.error(e); }
    finally {
        client.release();
        pool.end();
    }
}
fixCollision();
