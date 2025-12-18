import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No se ha subido ningún archivo' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
            return NextResponse.json({ message: 'No se encontraron datos en el archivo' }, { status: 400 });
        }

        // Fetch existing clubs for mapping
        const clubsRes = await query('SELECT id, name FROM clubs');
        const clubsMap = new Map();
        clubsRes.rows.forEach(c => clubsMap.set(c.name.trim().toLowerCase(), c.id));

        let createdCount = 0;
        let updatedCount = 0;
        let errors = [];

        for (const row of jsonData) {
            const name = row['Nombre']?.trim();
            const clubName = row['Club']?.trim();

            if (!name) continue; // Skip empty names

            // Resolve Club ID
            let clubId = null;
            if (clubName) {
                const normalizedClub = clubName.toLowerCase();
                if (clubsMap.has(normalizedClub)) {
                    clubId = clubsMap.get(normalizedClub);
                } else {
                    // Start: Optional - Create club if not exists? For now, just ignore or set null
                    // errors.push(`Club '${clubName}' not found for player '${name}'`);
                    // Create new club if strictly necessary, but maybe safer to just null it.
                    // Let's try to find partial match or just leave null.
                }
            }

            try {
                // Check if player exists
                const existingRes = await query('SELECT id FROM players WHERE LOWER(name) = LOWER($1)', [name]);

                if (existingRes.rows.length > 0) {
                    // Update
                    if (clubId) {
                        await query('UPDATE players SET current_club = $1 WHERE id = $2', [clubId, existingRes.rows[0].id]);
                        updatedCount++;
                    }
                    // If no club provided in excel, do not overwrite existing club
                } else {
                    // Create
                    await query('INSERT INTO players (name, current_club, created_at) VALUES ($1, $2, NOW())', [name, clubId]);
                    createdCount++;
                }
            } catch (err) {
                errors.push(`Error procesando ${name}: ${err.message}`);
            }
        }

        return NextResponse.json({
            message: 'Importación procesada',
            stats: { created: createdCount, updated: updatedCount },
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
