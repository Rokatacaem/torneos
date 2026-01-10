const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    try {
        const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
        const match = envFile.match(/DATABASE_URL=(.*)/);
        if (match) connectionString = match[1].trim().replace(/^"|"$/g, '');
    } catch (e) { }
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// Fake Vercel Blob URLs
const FAKE_BANNER = "https://public.blob.vercel-storage.com/banners/torneo-verano-xyz123.jpg";
const FAKE_LOGO = "https://public.blob.vercel-storage.com/logos/club-royal-abc456.png";
const FAKE_PLAYER = "https://public.blob.vercel-storage.com/players/juan-perez-def789.jpg";

async function runTest() {
    const client = await pool.connect();
    try {
        console.log('--- EXECUTING IMAGE UPLOAD TEST PROTOCOL ---');

        // 1. Create Club with Image
        console.log('\n[TEST 1] Create Club with details + Image...');
        const clubRes = await client.query(`
            INSERT INTO clubs (name, address, city, tables_billar, tables_pool, logo_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, ['Club Pruebas Imagen', 'Av. Test 123', 'Santiago', 3, 2, FAKE_LOGO]);
        const club = clubRes.rows[0];
        console.log(`✅ Club Created: ID ${club.id}, Image: ${club.logo_url}`);

        // 2. Create Tournament with Banner & Logo (if supported, assuming just banner for now based on schema)
        console.log('\n[TEST 2] Create Tournament with Banner...');
        // Checking schema, tournaments has banner_image_url and logo_image_url
        const tourRes = await client.query(`
            INSERT INTO tournaments (name, start_date, end_date, max_players, format, status, banner_image_url, logo_image_url, host_club_id)
            VALUES ($1, NOW(), NOW() + interval '1 day', 16, 'groups', 'open', $2, $3, $4)
            RETURNING *
        `, ['Torneo Visual 2025', FAKE_BANNER, FAKE_LOGO, club.id]);
        const tour = tourRes.rows[0];
        console.log(`✅ Tournament Created: ID ${tour.id}`);
        console.log(`   Banner: ${tour.banner_image_url}`);
        console.log(`   Logo: ${tour.logo_image_url}`);

        // 3. Create Player with Photo
        console.log('\n[TEST 3] Create Player with Photo...');
        const playerRes = await client.query(`
            INSERT INTO players (name, current_club, photo_url, category, active)
            VALUES ($1, $2, $3, 'A', true)
            RETURNING *
        `, ['Jugador Fotogénico', 'Club Pruebas Imagen', FAKE_PLAYER]);
        const player = playerRes.rows[0];
        console.log(`✅ Player Created: ID ${player.id}, Photo: ${player.photo_url}`);

        console.log('\n--- SUMMARY ---');
        console.log('All entities created successfully with image references.');

        return {
            club,
            tour,
            player
        };

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

runTest();
