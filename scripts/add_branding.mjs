
import { query } from '../app/lib/db.js';

async function addColumn() {
    try {
        console.log('Checking for branding_image_url column...');
        await query(`
      ALTER TABLE tournaments 
      ADD COLUMN IF NOT EXISTS branding_image_url text;
    `);
        console.log('Column branding_image_url ensured.');
    } catch (err) {
        console.error('Error adding column:', err);
    }
}

addColumn();
