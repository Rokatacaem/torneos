'use server';

import { query } from './db';
import { revalidatePath } from 'next/cache';
import { saveFile } from './upload-utils';
import { calculateFechillarHandicap } from '@/app/lib/utils';
import { getSession } from '@/app/lib/auth';


// --- TORNEOS ---

export async function getTournaments() {
    const result = await query(`
    SELECT * FROM tournaments 
    ORDER BY start_date DESC
  `);
    return result.rows;
}

export async function getTournament(id) {
    const result = await query(`
    SELECT * FROM tournaments WHERE id = $1
  `, [id]);
    // Force fresh data if needed, but usually revalidatePath handles it.
    // However, for immediate actions like preview, let's ensure we don't rely on stale Data Cache.
    return result.rows[0];
}

// Moved to top
export async function createTournament(formData) {
    try {
        // Extract data from FormData
        const name = formData.get('name');
        const start_date = formData.get('start_date');
        const end_date = formData.get('end_date');
        const max_players = parseInt(formData.get('max_players'));
        const format = formData.get('format');
        const group_size = parseInt(formData.get('group_size'));
        const shot_clock_seconds = parseInt(formData.get('shot_clock_seconds') || '40');
        const group_points_limit = parseInt(formData.get('group_points_limit') || '30');
        const group_innings_limit = parseInt(formData.get('group_innings_limit') || '20');
        const playoff_points_limit = parseInt(formData.get('playoff_points_limit') || '40');
        const playoff_innings_limit = parseInt(formData.get('playoff_innings_limit') || '30');
        const use_handicap = formData.get('use_handicap') === 'true';
        const block_duration = parseInt(formData.get('block_duration')) || null;

        // New Fields
        const semifinal_points_limit = parseInt(formData.get('semifinal_points_limit')) || null;
        const semifinal_innings_limit = parseInt(formData.get('semifinal_innings_limit')) || null;
        const final_points_limit = parseInt(formData.get('final_points_limit')) || null;
        const final_innings_limit = parseInt(formData.get('final_innings_limit')) || null;

        const playoff_target_size = parseInt(formData.get('playoff_target_size')) || 16;
        const qualifiers_per_group = parseInt(formData.get('qualifiers_per_group')) || 2;

        const host_club_id = formData.get('host_club_id') || null;
        const discipline = formData.get('discipline') || null;
        let tables_available = parseInt(formData.get('tables_available')) || 4;

        // File Uploads
        let banner_image_url = formData.get('banner_image_url') || null;
        let logo_image_url = formData.get('logo_image_url') || null;

        const bannerFile = formData.get('banner_image');
        const logoFile = formData.get('logo_image');

        // Verify Token if files are present (Legacy/Fallback Server-Side Upload)
        if ((bannerFile && bannerFile.size > 0) || (logoFile && logoFile.size > 0)) {
            if (!process.env.BLOB_READ_WRITE_TOKEN) {
                // Return a clear error instead of failing silently or crashing
                return { success: false, message: 'Error de Configuración: Falta BLOB_READ_WRITE_TOKEN para subir imágenes.' };
            }
        }

        if (!banner_image_url && bannerFile && bannerFile.size > 0) {
            banner_image_url = await saveFile(bannerFile, 'tournaments');
        }

        if (!logo_image_url && logoFile && logoFile.size > 0) {
            logo_image_url = await saveFile(logoFile, 'tournaments');
        }

        const result = await query(`
            INSERT INTO tournaments 
            (
                name, start_date, end_date, max_players, format, group_size, shot_clock_seconds, 
                group_points_limit, group_innings_limit, playoff_points_limit, playoff_innings_limit, 
                use_handicap, banner_image_url, logo_image_url,
                semifinal_points_limit, semifinal_innings_limit, final_points_limit, final_innings_limit,
                block_duration, playoff_target_size, qualifiers_per_group, host_club_id, tables_available, discipline
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            RETURNING *
        `, [
            name, start_date, end_date, max_players, format, group_size || 4,
            shot_clock_seconds || 40, group_points_limit, group_innings_limit, playoff_points_limit, playoff_innings_limit,
            use_handicap || false, banner_image_url, logo_image_url,
            semifinal_points_limit, semifinal_innings_limit, final_points_limit, final_innings_limit,
            block_duration, playoff_target_size, qualifiers_per_group, host_club_id, tables_available, discipline
        ]);

        revalidatePath('/tournaments');
        revalidatePath('/admin/tournaments');

        // Serialize return value to prevent "Unexpected response" due to Date objects
        return { success: true, tournament: JSON.parse(JSON.stringify(result.rows[0])) };
    } catch (e) {
        console.error("Error creating tournament:", e);
        return { success: false, message: e.message || 'Error desconocido al crear torneo' };
    }
}

// Safe integer parsing
function safeParseInt(val, fallback = null) {
    const parsed = parseInt(val);
    return isNaN(parsed) ? fallback : parsed;
}

export async function updateTournament(id, formData) {
    try {
        const name = formData.get('name');
        const start_date = formData.get('start_date');
        const end_date = formData.get('end_date');
        const max_players = safeParseInt(formData.get('max_players'));
        const format = formData.get('format');
        const group_size = safeParseInt(formData.get('group_size'));
        const shot_clock_seconds = safeParseInt(formData.get('shot_clock_seconds'), 40);
        const group_points_limit = safeParseInt(formData.get('group_points_limit'), 30);
        const group_innings_limit = safeParseInt(formData.get('group_innings_limit'), 20);
        const playoff_points_limit = safeParseInt(formData.get('playoff_points_limit'), 40);
        const playoff_innings_limit = safeParseInt(formData.get('playoff_innings_limit'), 30);
        const use_handicap = formData.get('use_handicap') === 'true';
        const block_duration = safeParseInt(formData.get('block_duration'));
        const tables_available = safeParseInt(formData.get('tables_available'), 4);
        const host_club_id = formData.get('host_club_id') || null;
        const discipline = formData.get('discipline') || null;

        const semifinal_points_limit = safeParseInt(formData.get('semifinal_points_limit'));
        const semifinal_innings_limit = safeParseInt(formData.get('semifinal_innings_limit'));
        const final_points_limit = safeParseInt(formData.get('final_points_limit'));
        const final_innings_limit = safeParseInt(formData.get('final_innings_limit'));

        // File Uploads (Update only if new file provided)
        let banner_image_url = formData.get('banner_image_url') || null;
        let logo_image_url = formData.get('logo_image_url') || null;

        const bannerFile = formData.get('banner_image');
        if (!banner_image_url && bannerFile && bannerFile.size > 0) {
            banner_image_url = await saveFile(bannerFile, 'tournaments');
        }

        const logoFile = formData.get('logo_image');
        if (!logo_image_url && logoFile && logoFile.size > 0) {
            logo_image_url = await saveFile(logoFile, 'tournaments');
        }

        // --- Dynamic SQL Construction ---
        let queryStr = `
            UPDATE tournaments 
            SET name = $1, start_date = $2, end_date = $3, max_players = $4, format = $5, group_size = $6, 
                shot_clock_seconds = $7, group_points_limit = $8, group_innings_limit = $9, 
                playoff_points_limit = $10, playoff_innings_limit = $11, use_handicap = $12, 
                block_duration = $13, tables_available = $14,
                semifinal_points_limit = $15, semifinal_innings_limit = $16, final_points_limit = $17, final_innings_limit = $18,
                playoff_target_size = $19, qualifiers_per_group = $20, host_club_id = $21, discipline = $22
        `;

        // Initialize params array with the base 22 parameters
        const params = [
            name, start_date, end_date, max_players, format, group_size,
            shot_clock_seconds, group_points_limit, group_innings_limit,
            playoff_points_limit, playoff_innings_limit, use_handicap,
            block_duration, tables_available,
            semifinal_points_limit, semifinal_innings_limit, final_points_limit, final_innings_limit,
            playoff_target_size, qualifiers_per_group, host_club_id, discipline
        ];

        let paramIndex = 23; // Start index for subsequent parameters

        if (banner_image_url) {
            queryStr += `, banner_image_url = $${paramIndex}`;
            params.push(banner_image_url);
            paramIndex++;
        }

        if (logo_image_url) {
            queryStr += `, logo_image_url = $${paramIndex}`;
            params.push(logo_image_url);
            paramIndex++;
        }

        queryStr += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(id);

        console.log("Executing updateTournament with params:", params);

        const result = await query(queryStr, params);

        // Auto-promote from Waitlist Logic (Restored)
        if (result.rows.length > 0) {
            const tournament = result.rows[0];
            const newMax = tournament.max_players;

            if (newMax) {
                const countRes = await query(`
                    SELECT COUNT(*) as count FROM tournament_players 
                    WHERE tournament_id = $1 AND(status = 'active' OR status IS NULL)
                `, [id]);
                let activeCount = parseInt(countRes.rows[0].count);

                if (activeCount < newMax) {
                    const spots = newMax - activeCount;
                    if (spots > 0) {
                        const waitlistRes = await query(`
                            SELECT id FROM tournament_players 
                            WHERE tournament_id = $1 AND status = 'waitlist'
                            ORDER BY id ASC 
                            LIMIT $2
                        `, [id, spots]);

                        for (const row of waitlistRes.rows) {
                            await query(`UPDATE tournament_players SET status = 'active' WHERE id = $1`, [row.id]);
                        }
                    }
                }
            }
        }

        revalidatePath('/tournaments');
        revalidatePath('/admin/tournaments');
        revalidatePath(`/admin/tournaments/${id}`);

        return { success: true, tournament: result.rows[0] };
    } catch (e) {
        console.error("Database Error in updateTournament:", e);
        // Important: Return a serializable object, do NOT throw, to avoid "Unexpected response" from Next.js
        return { success: false, message: e.message || 'Error desconocido al actualizar torneo' };
    }
}

export async function deleteTournament(id) {
    try {
        await query(`DELETE FROM tournaments WHERE id = $1`, [id]);
        revalidatePath('/tournaments');
        revalidatePath('/admin');
        revalidatePath('/admin/tournaments');
    } catch (error) {
        console.error('Error deleting tournament:', error);
        throw new Error('Failed to delete tournament');
    }
}

// --- JUGADORES ---

export async function getTournamentPlayers(tournamentId) {
    const result = await query(`
    SELECT tp.*, p.photo_url 
    FROM tournament_players tp
    LEFT JOIN players p ON tp.player_id = p.id
    WHERE tp.tournament_id = $1
    ORDER BY tp.player_name ASC
  `, [tournamentId]);
    return result.rows;
}

// Helper to get club name if ID provided
async function resolveClubName(clubId, providedName) {
    if (clubId) {
        const res = await query('SELECT name FROM clubs WHERE id = $1', [clubId]);
        if (res.rows.length > 0) return res.rows[0].name;
    }
    return providedName;
}

// Global Ranking
export async function getGlobalRanking() {
    const res = await query(`
        SELECT p.*, c.name as club_name 
        FROM players p
        LEFT JOIN clubs c ON p.club_id = c.id
        WHERE p.ranking > 0
        ORDER BY p.ranking ASC, p.name ASC
    `);
    return res.rows;
}



export async function registerPlayer(tournamentId, formData) {
    const player_name = formData.get('player_name');
    let team_name = formData.get('team_name'); // Fallback text
    const club_id = formData.get('club_id'); // ID selection
    const identification = formData.get('identification') ? formData.get('identification').trim() : null;
    let handicap = Number(formData.get('handicap') || 0);
    const average = parseFloat(formData.get('average') || '0');

    // Resolve team_name from club_id if present
    if (club_id) {
        team_name = await resolveClubName(club_id, team_name);
    }

    // Photo Upload
    let photo_url = null;
    const photoFile = formData.get('photo');
    if (photoFile && photoFile.size > 0) {
        photo_url = await saveFile(photoFile, 'players');
    }

    // Validar cupo
    // Validar cupo y asignar estado
    // Validar cupo y asignar estado
    const tour = await getTournament(tournamentId);

    // Auto-Calculate Handicap if enabled
    if (tour.use_handicap) {
        handicap = calculateFechillarHandicap(average);
    }

    const players = await getTournamentPlayers(tournamentId);

    // Contar solo jugadores activos
    const activePlayers = players.filter(p => p.status === 'active' || !p.status);

    let status = 'active';
    let warningMessage = null;

    if (tour.max_players && activePlayers.length >= tour.max_players) {
        status = 'waitlist';
        // No lanzamos error, simplemente lo ponemos en lista de espera
        warningMessage = 'Torneo lleno. Registrado en Lista de Espera.';
    }

    // Global Player Logic
    let playerId = null;
    const cleanName = player_name.trim();

    // Check by Identification FIRST if provided
    let existingPlayer = { rows: [] };
    if (identification) {
        existingPlayer = await query('SELECT id, club_id, photo_url FROM players WHERE identification = $1', [identification]);
    }

    // Fallback to Name check if no ID match (or no ID provided)
    if (existingPlayer.rows.length === 0) {
        existingPlayer = await query('SELECT id, club_id, photo_url FROM players WHERE name ILIKE $1', [cleanName]);
    }

    if (existingPlayer.rows.length > 0) {
        playerId = existingPlayer.rows[0].id;

        // Update club/photo if provided
        const updateFields = [];
        const updateParams = [];
        let paramIdx = 1;

        if (club_id) {
            updateFields.push(`club_id = $${paramIdx++}`);
            updateParams.push(club_id);
        } else if (team_name) {
            // If manual text provided and no ID, maybe clear ID or ignore? 
            // Ideally we shouldn't mix text/ID. Let's assume ID is authoritative.
        }

        if (photo_url) {
            updateFields.push(`photo_url = $${paramIdx++}`);
            updateParams.push(photo_url);
        }
        // Always update identification if provided and missing? Or overwrite? Let's overwrite/ensure it's set.
        if (identification) {
            updateFields.push(`identification = $${paramIdx++}`);
            updateParams.push(identification);
        }
        // Also ensure name is updated to preferred casing? optional.

        if (updateFields.length > 0) {
            updateFields.push(`average = $${paramIdx++}`);
            updateParams.push(average);

            updateParams.push(playerId); // ID is last param
            await query(`UPDATE players SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`, updateParams);
        }

        // If no new photo, use existing one for tournament record?
        // Actually tournament_players table doesn't have photo_url, it joins with players table usually?
        // OR we duplicate it? For now, we rely on the JOIN in getTournamentPlayers to fetch it?
        // Let's check getTournamentPlayers... it does NOT join players table yet. 
        // We should update getTournamentPlayers query to fetch photo_url from global players table.
    } else {
        // Create new Global Player
        const newGlobal = await query(`
            INSERT INTO players (name, club_id, identification, photo_url, average)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [cleanName, club_id || null, identification, photo_url, average]);
        playerId = newGlobal.rows[0].id; // using 'name' column based on previous debugging
    }

    const result = await query(`
    INSERT INTO tournament_players (tournament_id, player_name, team_name, handicap, player_id, status, average)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [tournamentId, cleanName, team_name, handicap, playerId, status, average]);

    revalidatePath(`/admin/tournaments/${tournamentId}`);
    return { ...result.rows[0], warning: warningMessage };
}

// Actions for Group Management
export async function swapPlayers(player1Id, player2Id, tournamentId) {
    try {
        console.log(`Swapping players: ${player1Id} <-> ${player2Id}`);

        // 1. Get all scheduled matches for both players
        const matchesP1 = await query(`
            SELECT id, player1_id, player2_id FROM tournament_matches 
            WHERE tournament_id = $1 AND status = 'scheduled' AND (player1_id = $2 OR player2_id = $2)
        `, [tournamentId, player1Id]);

        const matchesP2 = await query(`
            SELECT id, player1_id, player2_id FROM tournament_matches 
            WHERE tournament_id = $1 AND status = 'scheduled' AND (player1_id = $2 OR player2_id = $2)
        `, [tournamentId, player2Id]);

        // 2. Perform Swap
        // This is tricky because we need to be careful not to create conflicts if they play each other.
        // But for group stage swaps, we effectively just want to replace P1 with P2 in all their matches.

        // Transaction-like approach (simplified)
        await query('BEGIN');

        // Update matches where P1 is player1 -> Set temp placeholder
        await query(`UPDATE tournament_matches SET player1_id = -1 WHERE tournament_id = $1 AND player1_id = $2 AND status = 'scheduled'`, [tournamentId, player1Id]);
        // Update matches where P1 is player2 -> Set temp placeholder
        await query(`UPDATE tournament_matches SET player2_id = -1 WHERE tournament_id = $1 AND player2_id = $2 AND status = 'scheduled'`, [tournamentId, player1Id]);

        // Update matches where P2 is player1 -> Set to P1
        await query(`UPDATE tournament_matches SET player1_id = $2 WHERE tournament_id = $1 AND player1_id = $3 AND status = 'scheduled'`, [tournamentId, player1Id, player2Id]);
        // Update matches where P2 is player2 -> Set to P1
        await query(`UPDATE tournament_matches SET player2_id = $2 WHERE tournament_id = $1 AND player2_id = $3 AND status = 'scheduled'`, [tournamentId, player1Id, player2Id]);

        // Update placeholders (-1) -> Set to P2
        await query(`UPDATE tournament_matches SET player1_id = $3 WHERE tournament_id = $1 AND player1_id = -1`, [tournamentId, player1Id, player2Id]);
        await query(`UPDATE tournament_matches SET player2_id = $3 WHERE tournament_id = $1 AND player2_id = -1`, [tournamentId, player1Id, player2Id]);

        await query('COMMIT');

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, message: 'Jugadores intercambiados correctamente' }; // Mensaje en español
    } catch (e) {
        await query('ROLLBACK');
        console.error(e);
        return { success: false, message: 'Error al intercambiar jugadores' };
    }
}

export async function replaceWithWaitlist(originalPlayerId, tournamentId) {
    try {
        // 1. Find FIFO waitlist player
        const waitlistRes = await query(`
            SELECT * FROM tournament_players 
            WHERE tournament_id = $1 AND status = 'waitlist'
            ORDER BY id ASC 
            LIMIT 1
        `, [tournamentId]);

        if (waitlistRes.rows.length === 0) {
            return { success: false, message: 'No hay jugadores en lista de espera' };
        }

        const replacement = waitlistRes.rows[0];

        await query('BEGIN');

        // 2. Update matches of original player to use replacement
        await query(`
            UPDATE tournament_matches 
            SET player1_id = $1 
            WHERE tournament_id = $2 AND player1_id = $3 AND status = 'scheduled'
        `, [replacement.id, tournamentId, originalPlayerId]);

        await query(`
            UPDATE tournament_matches 
            SET player2_id = $1 
            WHERE tournament_id = $2 AND player2_id = $3 AND status = 'scheduled'
        `, [replacement.id, tournamentId, originalPlayerId]);

        // 3. Update Statuses
        await query(`UPDATE tournament_players SET status = 'eliminated' WHERE id = $1`, [originalPlayerId]);
        await query(`UPDATE tournament_players SET status = 'active' WHERE id = $1`, [replacement.id]);

        await query('COMMIT');

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, message: `Jugador reemplazado por ${replacement.player_name}` };
    } catch (e) {
        await query('ROLLBACK');
        console.error(e);
        return { success: false, message: 'Error al reemplazar jugador' };
    }
}

export async function updatePlayer(playerId, formData) {
    const player_name = formData.get('player_name');
    let team_name = formData.get('team_name');
    const club_id = formData.get('club_id');
    const identification = formData.get('identification');
    const handicap = Number(formData.get('handicap'));
    const ranking = Number(formData.get('ranking'));

    // Resolve team name
    if (club_id) {
        team_name = await resolveClubName(club_id, team_name);
    }

    // 1. Update Tournament Player (specific to this tournament)
    const result = await query(`
        UPDATE tournament_players 
        SET player_name = $1, team_name = $2, handicap = $3, ranking = $4
        WHERE id = $5
        RETURNING *
    `, [player_name, team_name, handicap, ranking, playerId]);

    if (result.rows.length > 0) {
        const tp = result.rows[0];
        const pid = tp.tournament_id;

        // 2. Update Global Player if linked
        if (tp.player_id) {
            // Check for photo upload
            let photo_url = null;
            const photoFile = formData.get('photo');
            if (photoFile && photoFile.size > 0) {
                photo_url = await saveFile(photoFile, 'players');
            }

            // Build Global Update Query
            let queryStr = 'UPDATE players SET name = $1';
            const params = [player_name];
            let paramIdx = 2;

            if (club_id) {
                queryStr += `, club_id = $${paramIdx++}`;
                params.push(club_id);
            }

            if (identification) {
                queryStr += `, identification = $${paramIdx++}`;
                params.push(identification);
            }

            if (photo_url) {
                queryStr += `, photo_url = $${paramIdx++}`;
                params.push(photo_url);
            }

            queryStr += ` WHERE id = $${paramIdx}`;
            params.push(tp.player_id);

            await query(queryStr, params);
        }

        revalidatePath(`/admin/tournaments/${pid}`);
    }

    return result.rows[0];
}



export async function removePlayer(tournamentId, playerId) {
    // 1. Check if tournament has started or matches exist involving this player?
    // For now, we assume removal is allowed if no matches played mostly.
    // Ideally, we should check matches status.

    await query('BEGIN');
    try {
        // Delete player
        await query('DELETE FROM tournament_players WHERE id = $1 AND tournament_id = $2', [playerId, tournamentId]);

        // Waitlist Management: Check if we need to promote someone
        // If tournament was full, now we have 1 spot.
        // We find the oldest waitlist player and promote them to active.

        const tour = await getTournament(tournamentId);
        const players = await getTournamentPlayers(tournamentId);
        const activeCount = players.filter(p => p.status === 'active' || !p.status).length;

        if (tour.max_players && activeCount < tour.max_players) {
            // Find oldest waitlist
            const waitlistRes = await query(`
                SELECT * FROM tournament_players 
                WHERE tournament_id = $1 AND status = 'waitlist'
                ORDER BY id ASC 
                LIMIT 1
            `, [tournamentId]);

            if (waitlistRes.rows.length > 0) {
                const nextPlayer = waitlistRes.rows[0];
                await query(`UPDATE tournament_players SET status = 'active' WHERE id = $1`, [nextPlayer.id]);
            }
        }

        await query('COMMIT');
        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true };
    } catch (e) {
        await query('ROLLBACK');
        console.error(e);
        throw new Error('Error eliminando jugador');
    }
}

export async function searchPlayers(term) {
    if (!term || term.length < 2) return [];
    const result = await query(`
        SELECT * FROM players 
        WHERE name ILIKE $1 
        ORDER BY name ASC 
        LIMIT 10
    `, [`%${term}%`]);
    return result.rows;
}
// --- CLUB MANAGEMENT ---

export async function getClubs() {
    const result = await query(`SELECT * FROM clubs ORDER BY name ASC`);
    return result.rows;
}

export async function getClub(id) {
    const result = await query(`SELECT * FROM clubs WHERE id = $1`, [id]);
    return result.rows[0];
}

export async function getPlayersByClub(clubId) {
    const result = await query(`
        SELECT * FROM players 
        WHERE club_id = $1 
        ORDER BY ranking ASC NULLS LAST, name ASC
    `, [clubId]);
    return result.rows;
}

export async function createClub(formData) {
    try {
        const name = formData.get('name');
        const short_name = formData.get('short_name');
        const country = formData.get('country');
        const city = formData.get('city');
        const address = formData.get('address');

        console.log('Creating Club:', { name, short_name, country, city, address });

        const tables_billar = parseInt(formData.get('tables_billar') || '0');
        const tables_pool = parseInt(formData.get('tables_pool') || '0');
        const tables_bola9 = parseInt(formData.get('tables_bola9') || '0');
        const tables_snooker = parseInt(formData.get('tables_snooker') || '0');

        let logo_url = formData.get('logo_url') || null;
        const logo = formData.get('logo');
        if (!logo_url && logo && logo.size > 0) {
            console.log('Processing Logo...');
            logo_url = await saveFile(logo, 'clubs');
        }

        const result = await query(`
            INSERT INTO clubs (name, short_name, country, city, address, tables_billar, tables_pool, tables_bola9, tables_snooker, logo_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [name, short_name, country, city, address, tables_billar, tables_pool, tables_bola9, tables_snooker, logo_url]);

        revalidatePath('/admin/clubs');
        return { success: true, club: result.rows[0] };
    } catch (e) {
        console.error('Error in createClub:', e);
        return { success: false, message: e.message };
    }
}

export async function updateClub(id, formData) {
    const name = formData.get('name');
    const short_name = formData.get('short_name');
    const country = formData.get('country');
    const city = formData.get('city');
    const address = formData.get('address');
    const tables_billar = parseInt(formData.get('tables_billar') || '0');
    const tables_pool = parseInt(formData.get('tables_pool') || '0');
    const tables_bola9 = parseInt(formData.get('tables_bola9') || '0');
    const tables_snooker = parseInt(formData.get('tables_snooker') || '0');

    let logo_url = formData.get('logo_url') || null;
    const logo = formData.get('logo');
    if (!logo_url && logo && logo.size > 0) {
        logo_url = await saveFile(logo, 'clubs');
    }

    let queryStr = 'UPDATE clubs SET name = $1, short_name = $2, country = $3, city = $4, address = $5, tables_billar = $6, tables_pool = $7, tables_bola9 = $8, tables_snooker = $9';
    const params = [name, short_name, country, city, address, tables_billar, tables_pool, tables_bola9, tables_snooker];
    let paramIdx = 10;

    if (logo_url) {
        queryStr += `, logo_url = $${paramIdx++}`;
        params.push(logo_url);
    }

    queryStr += ` WHERE id = $${paramIdx}`;
    params.push(id);

    const result = await query(queryStr + ' RETURNING *', params);

    revalidatePath('/admin/clubs');
    return result.rows[0];
}

export async function deleteClub(id) {
    // Check if players exist? For now cascade or error. Foreign key default usually restricts.
    // Let's assume strict.
    try {
        await query(`DELETE FROM clubs WHERE id = $1`, [id]);
        revalidatePath('/admin/clubs');
    } catch (e) {
        throw new Error('No se puede eliminar club con jugadores');
    }
}


// --- GLOBAL PLAYER MANAGEMENT ---

export async function getGlobalPlayers() {
    const result = await query(`
        SELECT p.*, c.name as club_name 
        FROM players p
        LEFT JOIN clubs c ON p.club_id = c.id
        ORDER BY p.name ASC
    `);
    return result.rows;
}

export async function createGlobalPlayer(formData) {
    const session = await getSession();
    if (!session || !session.userId) { // Minimal check: must be logged in
        throw new Error('Unauthorized');
    }

    const name = formData.get('name');
    const club_id = formData.get('club_id') || null;
    const identification = formData.get('identification') || null;

    // Photo Upload
    let photo_url = formData.get('photo_url') || null;
    const photoFile = formData.get('photo');
    if (!photo_url && photoFile && photoFile.size > 0) {
        photo_url = await saveFile(photoFile, 'players');
    }

    const result = await query(`
        INSERT INTO players (name, club_id, identification, photo_url)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `, [name, club_id, identification, photo_url]);

    revalidatePath('/admin/players');
    return result.rows[0];
}

export async function updateGlobalPlayer(id, formData) {
    const session = await getSession();
    const role = session?.role;
    if (role !== 'admin' && role !== 'superadmin' && role !== 'SUPERADMIN') {
        throw new Error('Unauthorized: Only admins can edit players.');
    }

    const name = formData.get('name');
    const club_id = formData.get('club_id') || null;
    const identification = formData.get('identification') || null;

    // Build update query dynamically based on photo presence
    let photo_url = formData.get('photo_url') || null;
    const photoFile = formData.get('photo');
    if (!photo_url && photoFile && photoFile.size > 0) {
        photo_url = await saveFile(photoFile, 'players');
    }

    let queryStr = 'UPDATE players SET name = $1, club_id = $2';
    const params = [name, club_id];
    let paramIdx = 3;

    if (identification) {
        queryStr += `, identification = $${paramIdx++}`;
        params.push(identification);
    }

    if (photo_url) {
        queryStr += `, photo_url = $${paramIdx++}`;
        params.push(photo_url);
    }

    queryStr += ` WHERE id = $${paramIdx}`;
    params.push(id);

    const result = await query(queryStr + ' RETURNING *', params);

    revalidatePath('/admin/players');
    return result.rows[0];
}

export async function deleteGlobalPlayer(id) {
    const session = await getSession();
    const role = session?.role;
    if (role !== 'admin' && role !== 'superadmin' && role !== 'SUPERADMIN') {
        throw new Error('Unauthorized: Only admins can delete players.');
    }

    try {
        await query('DELETE FROM players WHERE id = $1', [id]);
        revalidatePath('/admin/players');
        return { success: true };
    } catch (e) {
        console.error('Error deleting player:', e);
        throw new Error('No se puede eliminar: El jugador está participando en torneos.');
    }
}

// --- FASES Y PARTIDAS ---

export async function getTournamentPhases(tournamentId) {
    const result = await query(`
    SELECT * FROM tournament_phases 
    WHERE tournament_id = $1
    ORDER BY sequence_order ASC
  `, [tournamentId]);
    return result.rows;
}

export async function getMatches(tournamentId) {
    // Obtenemos partidos con nombres de jugadores resueltos
    const result = await query(`
        SELECT m.*, 
               p1.player_name as player1_name, p1.handicap as player1_handicap, p1.team_name as player1_team,
               p2.player_name as player2_name, p2.handicap as player2_handicap, p2.team_name as player2_team,
               g.name as group_name,
               g.start_time as group_start_time,
               g.table_assignment as group_table,
               ph.name as phase_name,
               ph.type as phase_type,
               t.use_handicap
        FROM tournament_matches m
        JOIN tournaments t ON m.tournament_id = t.id
        LEFT JOIN tournament_players p1 ON m.player1_id = p1.id
        LEFT JOIN tournament_players p2 ON m.player2_id = p2.id
        LEFT JOIN tournament_groups g ON m.group_id = g.id
        LEFT JOIN tournament_phases ph ON m.phase_id = ph.id
        WHERE m.tournament_id = $1
        ORDER BY ph.sequence_order, g.name, m.table_number
    `, [tournamentId]);
    return result.rows;
}

export async function getRecentMatches(limit = 5) {
    const result = await query(`
        SELECT m.*, 
               p1.player_name as player1_name, 
               p2.player_name as player2_name,
               t.name as tournament_name
        FROM tournament_matches m
        JOIN tournaments t ON m.tournament_id = t.id
        LEFT JOIN tournament_players p1 ON m.player1_id = p1.id
        LEFT JOIN tournament_players p2 ON m.player2_id = p2.id
        WHERE m.status = 'completed'
        ORDER BY m.id DESC
        LIMIT $1
    `, [limit]);
    return result.rows;
}

export async function updateMatchResult(matchId, data) {
    const { score_p1, score_p2, innings, high_run_p1, high_run_p2, winner_id } = data;

    const result = await query(`
    UPDATE tournament_matches
    SET score_p1 = $1, score_p2 = $2, innings = $3, 
        high_run_p1 = $4, high_run_p2 = $5, winner_id = $6, status = 'completed'
    WHERE id = $7
    RETURNING *
  `, [score_p1, score_p2, innings, high_run_p1, high_run_p2, winner_id, matchId]);

    // Invalidamos caché general del torneo para actualizar tablas/llaves
    const match = result.rows[0];
    revalidatePath(`/tournaments/${match.tournament_id}`);
    revalidatePath(`/admin/tournaments/${match.tournament_id}`);

    return match;
}

// --- LOGICA DE GENERACION (Simplificada por ahora) ---

export async function generateGroups(tournamentId) { // Removed groupCount param as it should be derived
    // 0. Obtener config del torneo
    const tournament = await getTournament(tournamentId);
    const groupSize = tournament.group_size || 4;

    // 1. Crear Fase de Grupos
    const phaseRes = await query(`
    INSERT INTO tournament_phases (tournament_id, name, type, sequence_order)
    VALUES ($1, 'Fase de Grupos', 'group', 1)
    RETURNING id
  `, [tournamentId]);
    const phaseId = phaseRes.rows[0].id;

    // 2. Obtener jugadores ordenados por ranking
    const allPlayers = await getTournamentPlayers(tournamentId);

    // Filtrar solo jugadores activos
    const players = allPlayers.filter(p => p.status === 'active' || !p.status);

    // Calcular cantidad de grupos necesaria
    const groupCount = Math.ceil(players.length / groupSize);

    // Ordenar por Ranking DESC (Sembrado)
    const seededPlayers = players.sort((a, b) => {
        // Asumiendo que ranking mayor es mejor (o usar ASC si es posición 1, 2, 3...)
        // Si ranking es 0 o null, van al final
        const rankA = a.ranking || 0;
        const rankB = b.ranking || 0;
        if (rankA !== rankB) return rankB - rankA; // Mayor ranking primero
        return a.id - b.id; // Desempate por registro
    });

    // 3. Crear Grupos con Horarios y Mesas (Numerados 1, 2, 3...)
    const groups = [];

    // Config de Agenda
    const tablesAvailable = tournament.tables_available || 4;
    const blockDuration = tournament.block_duration || 180; // Default 3h
    const startDate = new Date(tournament.start_date);

    for (let i = 0; i < groupCount; i++) {
        // Calculate Schedule
        const turnIndex = Math.floor(i / tablesAvailable);
        const tableNum = (i % tablesAvailable) + 1;
        const startTime = new Date(startDate.getTime() + (turnIndex * blockDuration * 60000));

        const gRes = await query(`
        INSERT INTO tournament_groups (phase_id, name, start_time, table_assignment)
        VALUES ($1, $2, $3, $4)
        RETURNING id
    `, [phaseId, (i + 1).toString(), startTime, tableNum]);
        groups.push(gRes.rows[0].id);
    }

    // 4. Asignar jugadores a grupos (Snake System)
    // 0, 1, 2, 3, 3, 2, 1, 0, 0, 1...
    const groupAssignments = {};
    groups.forEach(g => groupAssignments[g] = []);

    seededPlayers.forEach((p, idx) => {
        const cycle = Math.floor(idx / groupCount);
        const isZigZag = cycle % 2 === 1; // 0=ida, 1=vuelta

        let targetGroupIdx;
        if (isZigZag) {
            // Vuelta (Reverse)
            targetGroupIdx = (groupCount - 1) - (idx % groupCount);
        } else {
            // Ida (Forward)
            targetGroupIdx = idx % groupCount;
        }

        groupAssignments[groups[targetGroupIdx]].push(p.id);
    });

    // Generar partidos por grupo
    for (const groupId of groups) {
        const pIds = groupAssignments[groupId];
        // Round robin: todos contra todos
        for (let i = 0; i < pIds.length; i++) {
            for (let j = i + 1; j < pIds.length; j++) {
                await query(`
            INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status)
            VALUES ($1, $2, $3, $4, $5, 'scheduled')
        `, [tournamentId, phaseId, groupId, pIds[i], pIds[j]]);
            }
        }
    }

    revalidatePath(`/admin/tournaments/${tournamentId}`);
    return { success: true };
}

export async function previewGroups(tournamentId) {
    const tournament = await getTournament(tournamentId);
    const groupSize = tournament.group_size || 4;
    const players = await getTournamentPlayers(tournamentId);
    const activePlayers = players.filter(p => p.status === 'active' || !p.status);

    const groupCount = Math.ceil(activePlayers.length / groupSize);

    // Sort by Ranking (Seeding)
    const seededPlayers = [...activePlayers].sort((a, b) => {
        const rankA = a.ranking || 0;
        const rankB = b.ranking || 0;
        if (rankA !== rankB) return rankB - rankA;
        return a.id - b.id;
    });

    // Config de Agenda
    const tablesAvailable = tournament.tables_available || 4;
    const blockDuration = tournament.block_duration || 180; // Default 3h
    const startDate = new Date(tournament.start_date);

    // Generate Groups Structure (Numbers 1, 2, 3...)
    const groups = [];
    for (let i = 0; i < groupCount; i++) {
        // Calculate Schedule
        const turnIndex = Math.floor(i / tablesAvailable);
        const tableNum = (i % tablesAvailable) + 1;
        const startTime = new Date(startDate.getTime() + (turnIndex * blockDuration * 60000));

        groups.push({
            name: (i + 1).toString(),
            players: [],
            schedule: {
                table: tableNum,
                startTime: startTime.toISOString()
            }
        });
    }

    // Snake Distribution
    seededPlayers.forEach((p, idx) => {
        const cycle = Math.floor(idx / groupCount);
        const isZigZag = cycle % 2 === 1;
        let targetGroupIdx;
        if (isZigZag) {
            targetGroupIdx = (groupCount - 1) - (idx % groupCount);
        } else {
            targetGroupIdx = idx % groupCount;
        }
        groups[targetGroupIdx].players.push(p);
    });

    return groups;
}

export async function generatePlayoffs(tournamentId) {
    console.log(`Generating playoffs for tournament ${tournamentId}`);

    // 0. Get configuration
    const tournament = await getTournament(tournamentId);
    const targetSize = tournament.playoff_target_size || 16;
    const qualifiersPerGroup = tournament.qualifiers_per_group || 2;

    // 1. Verify if elimination phase exists
    const existingPhase = await query(`
        SELECT id FROM tournament_phases 
        WHERE tournament_id = $1 AND type = 'elimination'
    `, [tournamentId]);

    if (existingPhase.rows.length > 0) {
        throw new Error('Ya existen playoffs generados');
    }

    // 2. Get group results and stats
    const matches = await getMatches(tournamentId);
    const groups = {}; // groupId -> { players: { playerId: { points, sets, avg... } } }

    const initStats = () => ({ points: 0, innings: 0, score: 0, matches: 0 });

    matches.filter(m => m.phase_type === 'group' && m.status === 'completed').forEach(m => {
        if (!groups[m.group_id]) groups[m.group_id] = {};
        const g = groups[m.group_id];

        if (!g[m.player1_id]) g[m.player1_id] = initStats();
        if (!g[m.player2_id]) g[m.player2_id] = initStats();

        const p1 = g[m.player1_id];
        const p2 = g[m.player2_id];

        p1.matches++;
        p2.matches++;
        p1.innings += (m.innings || 0);
        p2.innings += (m.innings || 0);
        p1.score += (m.score_p1 || 0);
        p2.score += (m.score_p2 || 0);

        if (m.winner_id === m.player1_id) p1.points += 2;
        else if (m.winner_id === m.player2_id) p2.points += 2;
        else { p1.points += 1; p2.points += 1; }
    });

    // 3. Determine Qualifiers
    let qualified = [];

    // Sort players within each group and pick top N
    for (const gid in groups) {
        const pStats = groups[gid];
        const sorted = Object.entries(pStats).map(([pid, stats]) => {
            const avg = stats.innings > 0 ? stats.score / stats.innings : 0;
            return { pid: parseInt(pid), ...stats, avg };
        })
            .sort((a, b) => b.points - a.points || b.avg - a.avg);

        // Take qualifiersPerGroup
        for (let i = 0; i < qualifiersPerGroup; i++) {
            if (sorted[i]) {
                qualified.push({ ...sorted[i], rankInGroup: i + 1, groupId: gid });
            }
        }
    }

    if (qualified.length < 2) throw new Error('No hay suficientes partidos jugados para generar llaves');

    // Sort ALL qualifiers globally for seeding
    qualified.sort((a, b) => b.points - a.points || b.avg - a.avg);

    // 4. Calculate Adjustment Logic
    const totalQualified = qualified.length;
    let mainRoundSize = targetSize; // e.g. 32

    // Check if we need Preliminary Round (Repechaje)
    // Formula: Excess = Total - Target
    // If Excess > 0, we have a Prelim Round.
    // Prelim Matches = Excess.
    // Prelim Players (Bottom of list) = 2 * Excess.
    // Direct to Main (Top of list) = Target - Excess.

    // If Total < Target, we have BYEs (handled later by standard filling)

    const excess = totalQualified - targetSize;

    if (excess > 0) {
        const prelimMatchesCount = excess;
        const prelimPlayersCount = excess * 2;
        const directQualifiersCount = targetSize - excess;

        console.log(`Adjustment Needed: Total ${totalQualified}, Target ${targetSize}. Excess ${excess}.`);
        console.log(`Prelim Players: Bottom ${prelimPlayersCount}. Direct: Top ${directQualifiersCount}.`);

        // Create Preliminary Phase
        const prelimRes = await query(`
            INSERT INTO tournament_phases (tournament_id, name, type, sequence_order)
            VALUES ($1, 'Repechaje', 'elimination_prelim', 2)
            RETURNING id
        `, [tournamentId]);
        const prelimPhaseId = prelimRes.rows[0].id;

        // Create Main Phase
        const mainRes = await query(`
            INSERT INTO tournament_phases (tournament_id, name, type, sequence_order)
            VALUES ($1, 'Fase Final', 'elimination', 3)
            RETURNING id
        `, [tournamentId]);
        const mainPhaseId = mainRes.rows[0].id;

        // Split players
        const directQualifiers = qualified.slice(0, directQualifiersCount);
        const prelimPlayers = qualified.slice(directQualifiersCount, directQualifiersCount + prelimPlayersCount);

        // Generate Prelim Matches (Best of Prelim vs Worst of Prelim)
        const prelimSize = prelimPlayers.length; // Should be equivalent to prelimMatchesCount * 2
        for (let i = 0; i < prelimMatchesCount; i++) {
            const p1 = prelimPlayers[i];
            const p2 = prelimPlayers[prelimSize - 1 - i];

            await query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, player1_id, player2_id, status, round_number)
                VALUES ($1, $2, $3, $4, 'scheduled', 1)
            `, [tournamentId, prelimPhaseId, p1.pid, p2.pid]);
        }

        // Note: Direct qualifiers wait for the winners. 
        // We do NOT generate main round matches yet because we don't know who wins prelims.
        // OR we generate empty slots? 
        // Better: Just generate prelims. The system should update brackets when matches finish.
        // BUT current system might expect all matches. 
        // Let's generate prelims ONLY. The UI should show them. Note that 'directQualifiers' are effectively BYEs into Round 2 (or Main Round).

    } else {
        // Standard Power of 2 (or less players than target, needing BYEs in first round)
        // Ensure size is power of 2 >= totalQualified
        let size = 2;
        while (size < totalQualified) size *= 2;
        // Or if we strictly follow targetSize...
        // If totalQualified <= targetSize (which is usually power of 2), utilize targetSize
        if (targetSize >= totalQualified) size = targetSize;

        const phaseRes = await query(`
            INSERT INTO tournament_phases (tournament_id, name, type, sequence_order)
            VALUES ($1, 'Playoffs', 'elimination', 2)
            RETURNING id
        `, [tournamentId]);
        const phaseId = phaseRes.rows[0].id;

        const matchesToCreate = size / 2;

        for (let i = 0; i < matchesToCreate; i++) {
            const p1 = qualified[i];
            const p2 = qualified[size - 1 - i]; // Can be undefined (BYE)

            await query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, player1_id, player2_id, status, round_number)
                VALUES ($1, $2, $3, $4, 'scheduled', 1)
            `, [
                tournamentId,
                phaseId,
                p1 ? p1.pid : null,
                p2 ? p2.pid : null
            ]);
        }
    }


    revalidatePath(`/admin/tournaments/${tournamentId}`);
    return { success: true };
}

// --- RANKING SYSTEM INTEGRATION ---
import { assignTournamentPoints, updateGlobalRanking } from './ranking-system';

export async function finalizeRankingForTournament(tournamentId) {
    try {
        // 1. Assign points for this tournament
        const updatedCount = await assignTournamentPoints(tournamentId);

        // 2. Mark tournament as fully completed
        await query(`UPDATE tournaments SET status = 'completed' WHERE id = $1`, [tournamentId]);

        // 3. Recalculate Global Ranking
        const globalUpdates = await updateGlobalRanking();

        revalidatePath('/admin/ranking');
        revalidatePath(`/admin/tournaments/${tournamentId}`);

        return { success: true, message: `Asignados puntos a ${updatedCount} jugadores. Ranking global actualizado (${globalUpdates} cambios).` };
    } catch (e) {
        console.error(e);
        return { success: false, message: e.message };
    }
}

export async function recalculateGlobalRankingAction() {
    try {
        const count = await updateGlobalRanking();
        revalidatePath('/admin/ranking');
        return { success: true, message: `Ranking recalculado. ${count} jugadores actualizados.` };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

