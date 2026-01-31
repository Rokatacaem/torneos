require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const GROUP_ID = 409;
const TOURNAMENT_ID = 34;

async function checkAndAddReturnLeg() {
    try {
        const client = await pool.connect();

        // 1. Get existing matches
        const res = await client.query(`
            SELECT * FROM tournament_matches 
            WHERE group_id = $1 AND tournament_id = $2
        `, [GROUP_ID, TOURNAMENT_ID]);

        const existingMatches = res.rows;
        console.log(`Found ${existingMatches.length} existing matches.`);

        let createdCount = 0;

        // 2. Iterate and find missing reverse fixtures
        // We need to be careful not to duplicate if we run this multiple times.
        // We check against the database list we just fetched.

        // Use a Set to track pairs we have processed or that exist
        const pairSet = new Set();
        existingMatches.forEach(m => {
            pairSet.add(`${m.player1_id}-${m.player2_id}`);
        });

        for (const m of existingMatches) {
            const reverseKey = `${m.player2_id}-${m.player1_id}`;

            if (!pairSet.has(reverseKey)) {
                console.log(`Creating return leg: ${m.player2_id} vs ${m.player1_id}`);

                await client.query(`
                    INSERT INTO tournament_matches (
                        tournament_id, phase_id, group_id, 
                        player1_id, player2_id, 
                        status, 
                        updated_at
                    ) VALUES (
                        $1, $2, $3, 
                        $4, $5, 
                        'scheduled', 
                        NOW()
                    )
                `, [
                    TOURNAMENT_ID, m.phase_id, GROUP_ID,
                    m.player2_id, m.player1_id
                ]);

                pairSet.add(reverseKey); // Add to set so we don't duplicate if logic is weird
                createdCount++;
            }
        }

        console.log(`Created ${createdCount} new matches.`);

        client.release();
        await pool.end();
    } catch (e) {
        console.error("Error:", e);
    }
}

checkAndAddReturnLeg();
