require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function run() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to DB...');
        const client = await pool.connect();

        // 1. Find Club ID
        const clubRes = await client.query("SELECT id, name FROM clubs WHERE name ILIKE '%Calera%'");
        if (clubRes.rows.length === 0) {
            console.error('Club La Calera not found!');
            process.exit(1);
        }
        const clubId = clubRes.rows[0].id;
        console.log(`Found Club: ${clubRes.rows[0].name} (ID: ${clubId})`);

        // 2. Insert Tournament
        // Data: Verano La Calera 2026, 31-01 10:00 to 01-02 20:30, 48 players, Eliminación Directa, 3 Bandas
        const query = `
            INSERT INTO tournaments 
            (
                name, start_date, end_date, max_players, format, 
                discipline, host_club_id, tables_available,
                is_official, use_handicap,
                footer_branding_title, footer_branding_subtitle
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
        `;

        const values = [
            'Verano La Calera 2026', // Name
            '2026-01-31 10:00:00',   // Start
            '2026-02-01 20:30:00',   // End
            48,                      // Max
            'elimination',           // Format
            'Carambola 3 Bandas',    // Discipline
            clubId,                  // Host ID
            4,                       // Tables (Default)
            false,                   // Official
            false,                   // Handicap
            'Copa Hermandad',        // Footer Title (Default)
            'Chile - Argentina'      // Footer Subtitle (Default)
        ];

        const res = await client.query(query, values);
        console.log(`Tournament Created Successfully! ID: ${res.rows[0].id}`);

        client.release();
    } catch (err) {
        console.error('Error creating tournament:', err);
    } finally {
        await pool.end();
    }
}

run();
