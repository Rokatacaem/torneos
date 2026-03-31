import { NextResponse } from 'next/server';
import { query, getClient } from '@/app/lib/db';
import * as XLSX from 'xlsx';
import { getSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { searchParams } = new URL(request.url);
    const syncMode = searchParams.get('mode') === 'sync';

    // Sync mode is restricted to SUPERADMIN only
    if (syncMode) {
        const session = await getSession();
        const role = session?.role;
        if (!['SUPERADMIN', 'superadmin'].includes(role)) {
            return NextResponse.json(
                { error: 'Acción restringida: Solo el Superadministrador puede usar el Modo Sincronización.' },
                { status: 403 }
            );
        }
    }


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

        // Build clubs map (name -> id)
        const clubsRes = await query('SELECT id, name FROM clubs');
        const clubsMap = new Map();
        clubsRes.rows.forEach(c => clubsMap.set(c.name.trim().toLowerCase(), c.id));

        let createdCount = 0;
        let updatedCount = 0;
        let deletedCount = 0;
        let errors = [];
        const processedPlayerIds = new Set(); // Track IDs present in Excel

        for (const row of jsonData) {
            const name = row['Nombre']?.toString().trim();
            const clubName = row['Club']?.toString().trim();

            // ID_BD = internal database primary key (exported from the system)
            const rawIdBD = row['ID_BD'];
            const dbId = rawIdBD !== undefined && rawIdBD !== '' ? parseInt(rawIdBD, 10) : null;

            // Legacy field kept for backwards compatibility
            const identification = row['ID']?.toString().trim() || null;

            const rawAverage = row['Promedio'];
            const average = rawAverage !== undefined && rawAverage !== '' ? parseFloat(rawAverage) : null;

            const rawRanking = row['Ranking'];
            const ranking = rawRanking !== undefined && rawRanking !== '' ? parseInt(rawRanking, 10) : null;

            if (!name) continue;

            // Resolve or create club
            let clubId = null;
            if (clubName) {
                const normalizedClub = clubName.toLowerCase();
                if (clubsMap.has(normalizedClub)) {
                    clubId = clubsMap.get(normalizedClub);
                } else {
                    try {
                        const newClub = await query(
                            'INSERT INTO clubs (name, created_at) VALUES ($1, NOW()) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
                            [clubName]
                        );
                        clubId = newClub.rows[0].id;
                        clubsMap.set(normalizedClub, clubId);
                    } catch (e) {
                        errors.push(`No se pudo crear el club '${clubName}': ${e.message}`);
                    }
                }
            }

            try {
                // Match priority: 1) ID_BD (PK), 2) identification field, 3) name
                let existingId = null;

                if (dbId && !isNaN(dbId)) {
                    // Fastest and most reliable: direct PK lookup
                    const byPK = await query('SELECT id FROM players WHERE id = $1', [dbId]);
                    if (byPK.rows.length > 0) existingId = byPK.rows[0].id;
                }

                if (!existingId && identification) {
                    const byIdent = await query('SELECT id FROM players WHERE identification = $1', [identification]);
                    if (byIdent.rows.length > 0) existingId = byIdent.rows[0].id;
                }

                if (!existingId) {
                    const byName = await query(
                        'SELECT id FROM players WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))',
                        [name]
                    );
                    if (byName.rows.length > 0) existingId = byName.rows[0].id;
                }

                if (existingId) {
                    processedPlayerIds.add(existingId);

                    // Dynamic UPDATE
                    const setClauses = ['updated_at = NOW()', `name = $1`];
                    const params = [name];
                    let idx = 2;

                    if (clubId !== null) { setClauses.push(`club_id = $${idx++}`); params.push(clubId); }
                    if (average !== null && !isNaN(average)) { setClauses.push(`average = $${idx++}`); params.push(average); }
                    if (ranking !== null && !isNaN(ranking)) { setClauses.push(`ranking = $${idx++}`); params.push(ranking); }
                    if (identification) { setClauses.push(`identification = $${idx++}`); params.push(identification); }

                    params.push(existingId);
                    await query(
                        `UPDATE players SET ${setClauses.join(', ')} WHERE id = $${idx}`,
                        params
                    );
                    updatedCount++;
                } else {
                    const newPlayer = await query(
                        `INSERT INTO players (name, club_id, average, ranking, identification, created_at)
                         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
                        [name, clubId, average ?? null, ranking ?? null, identification]
                    );
                    processedPlayerIds.add(newPlayer.rows[0].id);
                    createdCount++;
                }
            } catch (err) {
                errors.push(`Error procesando '${name}': ${err.message}`);
            }
        }

        // --- SYNC MODE: Force-delete players not present in the Excel ---
        if (syncMode && processedPlayerIds.size > 0) {
            // Get all player IDs currently in DB
            const allPlayersRes = await query('SELECT id FROM players');
            const toDelete = allPlayersRes.rows
                .map(r => r.id)
                .filter(id => !processedPlayerIds.has(id));

            for (const playerId of toDelete) {
                const client = await getClient();
                try {
                    await client.query('BEGIN');
                    await client.query(`UPDATE tournament_matches SET winner_id = NULL WHERE winner_id = $1`, [playerId]);
                    await client.query(`DELETE FROM tournament_matches WHERE player1_id = $1 OR player2_id = $1`, [playerId]);
                    await client.query(`DELETE FROM tournament_players WHERE player_id = $1`, [playerId]);
                    await client.query(`DELETE FROM players WHERE id = $1`, [playerId]);
                    await client.query('COMMIT');
                    deletedCount++;
                } catch (e) {
                    await client.query('ROLLBACK');
                    errors.push(`No se pudo eliminar jugador ID ${playerId}: ${e.message}`);
                } finally {
                    client.release();
                }
            }
        }

        return NextResponse.json({
            message: 'Importación procesada',
            stats: {
                created: createdCount,
                updated: updatedCount,
                deleted: syncMode ? deletedCount : undefined,
                total: jsonData.length
            },
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
