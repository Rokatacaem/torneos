const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Try loading .env.local
try {
    dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
} catch (e) {
    console.error('Error loading env:', e);
}

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function checkData() {
    try {
        await client.connect();
        // Check Clubs
        const clubsRes = await client.query('SELECT COUNT(*) FROM clubs');
        console.log('Clubs Count:', clubsRes.rows[0].count);

        // Check Ranking Data (Top 5)
        // To see what "ranking" vs "average" values look like
        const rankingRes = await client.query('SELECT name, ranking, average FROM players WHERE ranking > 0 ORDER BY ranking DESC LIMIT 5');
        console.log('Top 5 by Ranking DESC:', rankingRes.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkData();
