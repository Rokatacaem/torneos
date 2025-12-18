// Removed import

// This won't work easily with 'use server' imports in scripts unless we use babel-node or similar, 
// or just copy the query to standard pg client.
// Better to simple query using PG client to mimic the function exactly.

const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function verifyOrder() {
    await client.connect();
    // Copy EXACT query from tournament-actions.js:getGlobalRanking
    const queryStr = `
        SELECT p.name, p.ranking, p.ranking_annual, c.name as club_name 
        FROM players p
        LEFT JOIN clubs c ON p.club_id = c.id
        WHERE p.ranking > 0
        ORDER BY p.ranking ASC, p.name ASC
    `;
    const res = await client.query(queryStr);
    console.log('--- Ranking Order (Top 5) ---');
    console.table(res.rows.slice(0, 5));
    console.log('--- Ranking Order (Bottom 5) ---');
    console.table(res.rows.slice(-5));
    await client.end();
}

verifyOrder();
