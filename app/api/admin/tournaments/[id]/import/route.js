import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { query } from '@/app/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
    const { id: tournamentId } = await params;

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No se ha subido ningún archivo' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
            return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 });
        }

        // Get Tournament Settings (Max Players)
        const tourRes = await query('SELECT max_players FROM tournaments WHERE id = $1', [tournamentId]);
        if (tourRes.rows.length === 0) {
            return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });
        }
        const tournament = tourRes.rows[0];
        const maxPlayers = tournament.max_players || 9999;

        // Current count
        const countRes = await query(`
            SELECT COUNT(*) as count FROM tournament_players 
            WHERE tournament_id = $1 AND (status = 'active' OR status IS NULL)
        `, [tournamentId]);
        let currentCount = parseInt(countRes.rows[0].count);

        const stats = {
            total: jsonData.length,
            registered: 0,
            waitlisted: 0,
            skipped: 0, // Already in tournament
            errors: []
        };

        for (const row of jsonData) {
            try {
                // Expected columns: Ranking, Nombre, Club, Promedio, ID
                let name = row['Nombre'];
                if (!name) continue; // Skip empty names
                name = name.trim();

                const clubName = row['Club'] ? row['Club'].trim() : null;
                const average = parseFloat(row['Promedio']) || 0;
                const externalId = row['ID']; // Optional global ID

                // 1. Resolve Global Player ID
                let playerId = null;
                let clubId = null;

                // Try to find Club ID if clubName provided
                if (clubName) {
                    const clubRes = await query('SELECT id FROM clubs WHERE name ILIKE $1', [clubName]);
                    if (clubRes.rows.length > 0) clubId = clubRes.rows[0].id;
                }

                // A. Try by ID
                if (externalId) {
                    const pRes = await query('SELECT id FROM players WHERE id = $1', [externalId]);
                    if (pRes.rows.length > 0) playerId = pRes.rows[0].id;
                }

                // B. Try by Name if no ID found
                if (!playerId) {
                    const pRes = await query('SELECT id FROM players WHERE name ILIKE $1', [name]);
                    if (pRes.rows.length > 0) playerId = pRes.rows[0].id;
                }

                // C. Create if not found
                if (!playerId) {
                    const newP = await query(`
                        INSERT INTO players (name, club_id, average)
                        VALUES ($1, $2, $3)
                        RETURNING id
                    `, [name, clubId, average]);
                    playerId = newP.rows[0].id;
                } else {
                    // Start updates (Updating average or club if provided in import?)
                    // For now, let's respect current DB data unless we want to force update.
                    // Implementation plan said "create new global player", implied reusing existing.
                    // Let's minimally ensure club_id is set if we found one and player didn't have one? 
                    // Keeping it simple: Just link.
                }

                // 2. Register in Tournament
                // Check if exists
                const existingTP = await query(`
                    SELECT id FROM tournament_players 
                    WHERE tournament_id = $1 AND player_id = $2
                `, [tournamentId, playerId]);

                if (existingTP.rows.length > 0) {
                    stats.skipped++;
                    continue;
                }

                // Determine Status
                let status = 'active';
                if (currentCount >= maxPlayers) {
                    status = 'waitlist';
                    stats.waitlisted++;
                } else {
                    stats.registered++;
                    currentCount++;
                }

                await query(`
                    INSERT INTO tournament_players (tournament_id, player_id, player_name, team_name, average, status)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [tournamentId, playerId, name, clubName, average, status]);

            } catch (err) {
                console.error('Row Import Error:', err, row);
                stats.errors.push(`Error con ${row['Nombre']}: ${err.message}`);
            }
        }

        return NextResponse.json({
            message: 'Importación procesada',
            stats
        });

    } catch (error) {
        console.error('Import API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
