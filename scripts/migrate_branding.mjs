import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Try loading various .env files
const envFiles = ['.env.local', '.env.development.local', '.env', '.env.development'];
let loaded = false;
for (const file of envFiles) {
    if (fs.existsSync(file)) {
        console.log(`Loading env from ${file}`);
        dotenv.config({ path: file });
        loaded = true;
    }
}

if (!loaded) console.warn("No .env files found!");
if (!process.env.DATABASE_URL) console.error("DATABASE_URL is missing from environment!");
else console.log("DATABASE_URL is set (" + process.env.DATABASE_URL.substring(0, 10) + "...)");

// We need to import db.js. 
// Since db.js is inside ../app/lib, and likely uses ESM syntax (export ...), .mjs is appropriate.
import { query } from '../app/lib/db.js';

async function migrate() {
    console.log("Starting migration: Add branding_image_url to tournaments...");
    try {
        await query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='branding_image_url') THEN 
                    ALTER TABLE tournaments ADD COLUMN branding_image_url TEXT; 
                    RAISE NOTICE 'Column branding_image_url added.';
                ELSE 
                    RAISE NOTICE 'Column branding_image_url already exists.';
                END IF; 
            END $$;
        `);
        console.log("Migration completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
