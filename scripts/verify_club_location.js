const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verifyLocationCrud() {
    const client = await pool.connect();
    try {
        console.log('Testing INSERT with location_url...');
        const testName = 'Test Club Location ' + Date.now();
        const testUrl = 'https://maps.google.com/test';

        const insertRes = await client.query(`
            INSERT INTO clubs (name, short_name, location_url)
            VALUES ($1, $2, $3)
            RETURNING id, name, location_url;
        `, [testName, 'TCL', testUrl]);

        const newClub = insertRes.rows[0];
        console.log('Inserted:', newClub);

        if (newClub.location_url === testUrl) {
            console.log('✅ INSERT success: location_url matches.');
        } else {
            console.error('❌ INSERT failed: location_url mismatch.');
        }

        console.log('Testing UPDATE location_url...');
        const updateUrl = 'https://maps.google.com/updated';
        const updateRes = await client.query(`
            UPDATE clubs SET location_url = $1 WHERE id = $2 RETURNING location_url;
        `, [updateUrl, newClub.id]);

        const updatedClub = updateRes.rows[0];
        console.log('Updated:', updatedClub);

        if (updatedClub.location_url === updateUrl) {
            console.log('✅ UPDATE success: location_url matches.');
        } else {
            console.error('❌ UPDATE failed: location_url mismatch.');
        }

        // Cleanup
        await client.query('DELETE FROM clubs WHERE id = $1', [newClub.id]);
        console.log('Cleanup: Test club deleted.');

    } catch (err) {
        console.error('Test Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

verifyLocationCrud();
