import { query } from '../app/lib/db.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function addColumn() {
    try {
        console.log('Checking for branding_image_url column...');
        await query(`
      ALTER TABLE tournaments 
      ADD COLUMN IF NOT EXISTS branding_image_url text;
    `);
        console.log('Column branding_image_url ensured.');
        process.exit(0);
    } catch (err) {
        console.error('Error adding column:', err);
        process.exit(1);
    }
}

addColumn();
