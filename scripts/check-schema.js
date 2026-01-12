const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function checkSchema() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        // ssl: { rejectUnauthorized: false } // Try without SSL first if localhost?
        // Or conditionally?
    });

    try {
        await client.connect();

        console.log('Checking connection info...');
        // Print usage/host (masking password)
        const host = client.connectionParameters.host;
        console.log('Connected to Host:', host);
        const db = client.connectionParameters.database;
        console.log('Database:', db);

        console.log('Checking metadata for tournament_matches...');
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tournament_matches';
        `);

        const columns = res.rows.map(r => r.column_name);
        console.log('Columns found:', columns.join(', '));

        if (columns.includes('round_number')) {
            console.log('SUCCESS: round_number column EXISTS in this database.');
        } else {
            console.log('FAILURE: round_number column MISSING in this database.');
        }

    } catch (error) {
        console.error('Check failed:', error);
    } finally {
        await client.end();
    }
}

checkSchema();
