const dotenv = require('dotenv');
dotenv.config(); // Load .env
dotenv.config({ path: '.env.local' }); // Load .env.local (overrides/additions)

if (!process.env.DATABASE_URL) {
    console.error("❌ ERROR CRÍTICO: No se encontró la variable DATABASE_URL.");
    console.error("Asegúrate de tener un archivo .env o .env.local con la conexión a la base de datos.");
    process.exit(1);
} else {
    // Mask password in log
    const secureUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
    console.log(`✅ DATABASE_URL cargada: ${secureUrl}`);
}

const { query } = require('../app/lib/db');
const bcrypt = require('bcryptjs');

async function createRefereeUser() {
    const username = 'juez';
    const password = '123';
    const role = 'referee';

    console.log(`Creating user '${username}' with role '${role}'...`);

    try {
        // 1. Check if exists
        const check = await query('SELECT * FROM users WHERE name = $1', [username]);
        if (check.rows.length > 0) {
            console.log('User already exists. Updating role/password...');
            const hash = await bcrypt.hash(password, 10);
            await query('UPDATE users SET password_hash = $1, role = $2 WHERE name = $3', [hash, role, username]);
            console.log('User updated.');
        } else {
            // 2. Create
            const hash = await bcrypt.hash(password, 10);
            await query(`
                INSERT INTO users (name, email, password_hash, role)
                VALUES ($1, $2, $3, $4)
            `, [username, 'juez@fechillar.cl', hash, role]);
            console.log('User created successfully.');
        }
    } catch (e) {
        console.error('Error creating user:', e);
    }
}

createRefereeUser();
