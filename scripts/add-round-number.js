const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

console.log('Starting migration script...');

async function migrate() {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    console.log('Env keys:', Object.keys(process.env).filter(k => k.includes('URL')));

    if (!connectionString) {
        console.error('Error: POSTGRES_URL not found in environment.');
        return;
    }

    // Determine SSL setting based on URL (Neon/Vercel usually needs SSL)
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    const sslConfig = isLocal ? false : { rejectUnauthorized: false };

    console.log(`Connecting to database (${isLocal ? 'Local' : 'Remote'})...`);

    const client = new Client({
        connectionString: connectionString,
        ssl: sslConfig
    });

    try {
        await client.connect();
        console.log('Connected successfully.');

        console.log('Running ALTER TABLE command...');
        await client.query(`
            ALTER TABLE tournament_matches 
            ADD COLUMN IF NOT EXISTS round_number INTEGER DEFAULT 1;
        `);

        console.log('Command executed.');
        console.log('MIGRATION_SUCCESS_MARKER');
    } catch (error) {
        console.error('MIGRATION_FAILED_MARKER');
        console.error('Error details:', error);
    } finally {
        await client.end();
        console.log('Disconnected.');
    }
}

migrate();
