import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Obtener la URL y limpiarla de parámetros problemáticos para el driver pg en Node
let url = process.env.DATABASE_URL;
if (url && url.includes('?')) {
    url = url.split('?')[0];
}

const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
});

async function addColumn() {
    try {
        await client.connect();
        console.log('Checking for branding_image_url column...');
        await client.query(`
      ALTER TABLE tournaments 
      ADD COLUMN IF NOT EXISTS branding_image_url text;
    `);
        console.log('Column branding_image_url ensured successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error adding column:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

addColumn();
