'use server';

import { query } from './db';
import { revalidatePath } from 'next/cache';
import { saveFile } from './upload-utils';
import { calculateFechillarHandicap } from '@/app/lib/utils';
import { getSession } from '@/app/lib/session';


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
        // Extended Logging
        console.log('createTournament called with formData');

        // Extract data with SAFE parsing
        const safeInt = (val, def = null) => {
            if (val === null || val === undefined || val === '') return def;
            const p = parseInt(val);
            return isNaN(p) ? def : p;
        };

        const name = formData.get('name');
        const start_date = formData.get('start_date');
        const end_date = formData.get('end_date');
        const max_players = safeInt(formData.get('max_players'));
        const format = formData.get('format');
        const group_size = safeInt(formData.get('group_size'), 4);

        const shot_clock_seconds = safeInt(formData.get('shot_clock_seconds'), 40);
        const group_points_limit = safeInt(formData.get('group_points_limit'), 30);
        const group_innings_limit = safeInt(formData.get('group_innings_limit'), 20);
        const playoff_points_limit = safeInt(formData.get('playoff_points_limit'), 40);
        const playoff_innings_limit = safeInt(formData.get('playoff_innings_limit'), 30);

        const use_handicap = formData.get('use_handicap') === 'true' || formData.get('use_handicap') === 'on';
        const block_duration = safeInt(formData.get('block_duration'));

        // New Fields
        const semifinal_points_limit = safeInt(formData.get('semifinal_points_limit'));
        const semifinal_innings_limit = safeInt(formData.get('semifinal_innings_limit'));
        const final_points_limit = safeInt(formData.get('final_points_limit'));
        const final_innings_limit = safeInt(formData.get('final_innings_limit'));

        const playoff_target_size = safeInt(formData.get('playoff_target_size'), 16);
        const qualifiers_per_group = safeInt(formData.get('qualifiers_per_group'), 2);

        const host_club_id = formData.get('host_club_id') || null;
        const discipline = formData.get('discipline') || null;
        let tables_available = safeInt(formData.get('tables_available'), 4);
        const group_format = formData.get('group_format') || 'round_robin';
        const is_official = formData.get('is_official') === 'on';

        const footer_branding_title = formData.get('footer_branding_title');
        const footer_branding_subtitle = formData.get('footer_branding_subtitle');
        const footer_info_text = formData.get('footer_info_text');
        const footer_center_title = formData.get('footer_center_title');

        // Log parameters for debugging "Unexpected Response"
        console.log("Tournament Params:", {
            name, start_date, end_date, max_players, format, group_size,
            shot_clock_seconds, use_handicap, tables_available, host_club_id
        });

        // File Uploads
        let banner_image_url = formData.get('banner_image_url') || null;
        let logo_image_url = formData.get('logo_image_url') || null;
        let branding_image_url = formData.get('branding_image_url') || null;

        const bannerFile = formData.get('banner_image');
        const logoFile = formData.get('logo_image');
        const brandingFile = formData.get('branding_image');

        // Verify Token if files are present (Legacy/Fallback Server-Side Upload)
        if ((bannerFile && bannerFile.size > 0) || (logoFile && logoFile.size > 0) || (brandingFile && brandingFile.size > 0)) {
            if (!process.env.BLOB_READ_WRITE_TOKEN) {
                // Return a clear error instead of failing silently or crashing
                // USER REQUEST: Create tournament even if token is missing (just skip images)
                console.warn('WARNING: Missing BLOB_READ_WRITE_TOKEN. Skipping server-side image upload.');
                // We just continue. logic below checks for process.env.BLOB_READ_WRITE_TOKEN again inside saveFile probably?
                // actually saveFile might crash if we call it.
                // so we should probably unset the files or ensure logic below doesn't run if token missing.
            }
        }

        const canUpload = !!process.env.BLOB_READ_WRITE_TOKEN;

        if (canUpload && !banner_image_url && bannerFile && bannerFile.size > 0) {
            banner_image_url = await saveFile(bannerFile, 'tournaments');
        }

        if (canUpload && !logo_image_url && logoFile && logoFile.size > 0) {
            logo_image_url = await saveFile(logoFile, 'tournaments');
        }

        if (canUpload && !branding_image_url && brandingFile && brandingFile.size > 0) {
            branding_image_url = await saveFile(brandingFile, 'tournaments');
        }



        const result = await query(`
            INSERT INTO tournaments 
            (
                name, start_date, end_date, max_players, format, group_size, shot_clock_seconds, 
                group_points_limit, group_innings_limit, playoff_points_limit, playoff_innings_limit, 
                use_handicap, banner_image_url, logo_image_url,
                semifinal_points_limit, semifinal_innings_limit, final_points_limit, final_innings_limit,
                block_duration, playoff_target_size, qualifiers_per_group, host_club_id, tables_available, discipline,
                group_format, branding_image_url, is_official,
                footer_branding_title, footer_branding_subtitle, footer_info_text, footer_center_title
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
            RETURNING id
        `, [
            name, start_date, end_date, max_players, format, group_size || 4,
            shot_clock_seconds || 40, group_points_limit, group_innings_limit, playoff_points_limit, playoff_innings_limit,
            use_handicap || false, banner_image_url, logo_image_url,
            semifinal_points_limit, semifinal_innings_limit, final_points_limit, final_innings_limit,
            block_duration, playoff_target_size, qualifiers_per_group, host_club_id, tables_available, discipline,
            group_format, branding_image_url, is_official,
            footer_branding_title, footer_branding_subtitle, footer_info_text, footer_center_title
        ]);

        if (result.rows.length === 0) {
            throw new Error('No se pudo crear el torneo (Error de Base de Datos)');
        }

        revalidatePath('/tournaments');
        revalidatePath('/admin/tournaments');

        // Return only the ID and success status to ensure serializability
        // and avoid "Unexpected response" errors from complex objects (Dates, BigInts, etc)
        // Client only needs to redirect.
        return { success: true, id: result.rows[0].id };
    } catch (e) {
        console.error("Error creating tournament:", e);
        // Ensure we return a plain object
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
        const group_format = formData.get('group_format') || 'round_robin';
        const is_official = formData.get('is_official') === 'on';

        const footer_branding_title = formData.get('footer_branding_title');
        const footer_branding_subtitle = formData.get('footer_branding_subtitle');
        const footer_center_title = formData.get('footer_center_title');
        const footer_info_text = formData.get('footer_info_text');

        const semifinal_points_limit = safeParseInt(formData.get('semifinal_points_limit'));
        const semifinal_innings_limit = safeParseInt(formData.get('semifinal_innings_limit'));
        const final_points_limit = safeParseInt(formData.get('final_points_limit'));
        const final_innings_limit = safeParseInt(formData.get('final_innings_limit'));
        const playoff_target_size = safeParseInt(formData.get('playoff_target_size'));
        const qualifiers_per_group = safeParseInt(formData.get('qualifiers_per_group'));

        // File Uploads (Update only if new file provided)
        let banner_image_url = formData.get('banner_image_url') || null;
        let logo_image_url = formData.get('logo_image_url') || null;
        let branding_image_url = formData.get('branding_image_url') || null;

        const bannerFile = formData.get('banner_image');
        if (!banner_image_url && bannerFile && bannerFile.size > 0) {
            banner_image_url = await saveFile(bannerFile, 'tournaments');
        }

        const logoFile = formData.get('logo_image');
        if (!logo_image_url && logoFile && logoFile.size > 0) {
            logo_image_url = await saveFile(logoFile, 'tournaments');
        }

        const brandingFile = formData.get('branding_image');
        if (!branding_image_url && brandingFile && brandingFile.size > 0) {
            branding_image_url = await saveFile(brandingFile, 'tournaments');
        }

        // --- Dynamic SQL Construction ---
        let queryStr = `
            UPDATE tournaments 
            SET name = $1, start_date = $2, end_date = $3, max_players = $4, format = $5, group_size = $6, 
                shot_clock_seconds = $7, group_points_limit = $8, group_innings_limit = $9, 
                playoff_points_limit = $10, playoff_innings_limit = $11, use_handicap = $12, 
                block_duration = $13, tables_available = $14,
                semifinal_points_limit = $15, semifinal_innings_limit = $16, final_points_limit = $17, final_innings_limit = $18,
                playoff_target_size = $19, qualifiers_per_group = $20, host_club_id = $21, discipline = $22,
                group_format = $23, is_official = $24,
                footer_branding_title = $25, footer_branding_subtitle = $26, footer_info_text = $27, footer_center_title = $28
        `;

        // Initialize params array with the base 23 parameters
        const params = [
            name, start_date, end_date, max_players, format, group_size,
            shot_clock_seconds, group_points_limit, group_innings_limit,
            playoff_points_limit, playoff_innings_limit, use_handicap,
            block_duration, tables_available,
            semifinal_points_limit, semifinal_innings_limit, final_points_limit, final_innings_limit,
            playoff_target_size, qualifiers_per_group, host_club_id, discipline,
            group_format, is_official,
            footer_branding_title, footer_branding_subtitle, footer_info_text, footer_center_title
        ];

        let paramIndex = 29; // Start index for subsequent parameters

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

        if (branding_image_url) {
            queryStr += `, branding_image_url = $${paramIndex}`;
            params.push(branding_image_url);
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
        throw new Error('Error al eliminar el torneo');
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

export async function registerBatchPlayers(tournamentId, playerIds) {
    try {
        if (!playerIds || playerIds.length === 0) return { success: false, message: 'No se seleccionaron jugadores.' };

        const tournament = await getTournament(tournamentId);
        const useHandicap = tournament.use_handicap;

        // 1. Get Details for selected players
        // We use ANY($1) for array param
        const playersRes = await query(`
            SELECT p.*, c.name as club_name 
            FROM players p
            LEFT JOIN clubs c ON p.club_id = c.id
            WHERE p.id = ANY($1)
        `, [playerIds]);

        const selectedPlayers = playersRes.rows;
        let count = 0;
        let errors = 0;

        // Count current active players first
        let currentActiveCountRes = await query('SELECT count(*) as c FROM tournament_players WHERE tournament_id = $1 AND (status = \'active\' OR status IS NULL)', [tournamentId]);
        let currentActiveCount = parseInt(currentActiveCountRes.rows[0].c);
        const maxPlayers = tournament.max_players || 9999;

        // 2. Iterate and Insert
        for (const p of selectedPlayers) {
            try {
                // Check if already in tournament
                const check = await query(`
                    SELECT id FROM tournament_players WHERE tournament_id = $1 AND player_id = $2
                `, [tournamentId, p.id]);

                if (check.rows.length > 0) continue; // Skip duplicate

                // Determine status based on capacity
                let status = 'active';
                if (currentActiveCount >= maxPlayers) {
                    status = 'waitlist';
                } else {
                    currentActiveCount++; // Consume a spot
                }

                // Calc handicap
                let handicap = 0;
                if (useHandicap) {
                    handicap = calculateFechillarHandicap(p.average || 0);
                }

                // Insert
                await query(`
                    INSERT INTO tournament_players (tournament_id, player_name, team_name, handicap, player_id, status, average)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    tournamentId,
                    p.name,
                    p.club_name || 'Sin Club',
                    handicap,
                    p.id,
                    status,
                    p.average || 0
                ]);

                count++;
            } catch (err) {
                console.error(`Error adding player ${p.name}:`, err);
                errors++;
            }
        }

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, count, message: `Agregados ${count} jugadores.` + (errors > 0 ? ` (${errors} errores)` : '') };

    } catch (e) {
        console.error("Batch Register Error:", e);
        return { success: false, message: e.message };
    }
}

// Actions for Group Management


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
    const team_name = formData.get('team_name');
    const club_id = formData.get('club_id');
    const identification = formData.get('identification');
    const handicap = Number(formData.get('handicap'));
    const ranking = Number(formData.get('ranking'));
    const average = parseFloat(formData.get('average') || '0');

    // Resolve team name
    if (club_id) {
        // team_name = await resolveClubName(...) // kept existing logic if any
    }

    // 1. Update Tournament Player (specific to this tournament)
    const result = await query(`
        UPDATE tournament_players 
        SET player_name = $1, team_name = $2, handicap = $3, ranking = $4, average = $5
        WHERE id = $6
        RETURNING *
    `, [player_name, team_name, handicap, ranking, average, playerId]);

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

export async function removePlayers(tournamentId, playerIds) {
    if (!playerIds || playerIds.length === 0) return { success: true };

    await query('BEGIN');
    try {
        // 1. Delete all selected players
        // We use ANY to pass the array
        await query(`
            DELETE FROM tournament_players 
            WHERE tournament_id = $1 AND id = ANY($2)
        `, [tournamentId, playerIds]);

        // 2. Waitlist Promotion Logic
        // Calculate how many spots opened up
        const tour = await getTournament(tournamentId);
        if (tour.max_players) {
            const remainingRes = await query(`
                SELECT COUNT(*) as count FROM tournament_players 
                WHERE tournament_id = $1 AND (status = 'active' OR status IS NULL)
            `, [tournamentId]);
            const activeCount = parseInt(remainingRes.rows[0].count);

            const spotsAvailable = tour.max_players - activeCount;

            if (spotsAvailable > 0) {
                const waitlistRes = await query(`
                    SELECT id FROM tournament_players 
                    WHERE tournament_id = $1 AND status = 'waitlist'
                    ORDER BY id ASC 
                    LIMIT $2
                `, [tournamentId, spotsAvailable]);

                for (const row of waitlistRes.rows) {
                    await query(`UPDATE tournament_players SET status = 'active' WHERE id = $1`, [row.id]);
                }
            }
        }

        await query('COMMIT');
        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true };
    } catch (e) {
        await query('ROLLBACK');
        console.error("Error bulk removing players:", e);
        throw new Error('Error eliminando jugadores seleccionados');
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
        const location_url = formData.get('location_url_external') || null;

        let logo_url = formData.get('logo_url') || null;
        const logo = formData.get('logo');
        if (!logo_url && logo && logo.size > 0) {
            console.log('Processing Logo...');
            logo_url = await saveFile(logo, 'clubs');
        }

        const result = await query(`
            INSERT INTO clubs (name, short_name, country, city, address, tables_billar, tables_pool, tables_bola9, tables_snooker, logo_url, location_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [name, short_name, country, city, address, tables_billar, tables_pool, tables_bola9, tables_snooker, logo_url, location_url]);

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
    const location_url = formData.get('location_url_external') || null;

    let logo_url = formData.get('logo_url') || null;
    const logo = formData.get('logo');
    if (!logo_url && logo && logo.size > 0) {
        logo_url = await saveFile(logo, 'clubs');
    }

    let queryStr = 'UPDATE clubs SET name = $1, short_name = $2, country = $3, city = $4, address = $5, tables_billar = $6, tables_pool = $7, tables_bola9 = $8, tables_snooker = $9, location_url = $10';
    const params = [name, short_name, country, city, address, tables_billar, tables_pool, tables_bola9, tables_snooker, location_url];
    let paramIdx = 11;

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
        throw new Error('No autorizado');
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
        throw new Error('No autorizado: Solo los administradores pueden editar jugadores.');
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
        throw new Error('No autorizado: Solo los administradores pueden eliminar jugadores.');
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


export async function deleteGlobalPlayers(ids) {
    const session = await getSession();
    const role = session?.role;
    if (role !== 'admin' && role !== 'superadmin' && role !== 'SUPERADMIN') {
        throw new Error('No autorizado: Solo los administradores pueden eliminar jugadores.');
    }

    if (!ids || ids.length === 0) return { success: true, count: 0 };

    try {
        await query('DELETE FROM players WHERE id = ANY($1)', [ids]);
        revalidatePath('/admin/players');
        return { success: true, count: ids.length };
    } catch (e) {
        console.error('Error deleting players:', e);
        throw new Error('No se pueden eliminar algunos jugadores porque están participando en torneos.');
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

    // Check for GSL Advancement (if match completed)
    if (match.status === 'completed') {
        try {
            const { checkGSLAdvancement } = await import('./gsl-logic');
            await checkGSLAdvancement(matchId);
        } catch (e) {
            console.error("Error in GSL Check:", e);
        }
    }

    return match;
}

// --- LOGICA DE GENERACION (Simplificada por ahora) ---

export async function generateGroups(tournamentId, scheduleOverrides = {}) {
    try {
        const tournament = await getTournament(tournamentId);

        // 0. Verificar si ya hay fase de grupos
        const phasesCheck = await query('SELECT id FROM tournament_phases WHERE tournament_id = $1', [tournamentId]);
        if (phasesCheck.rows.length > 0) {
            throw new Error('El fixture ya ha sido generado. Elimina las fases existentes para regenerar.');
        }

        const groupSize = tournament.group_size || 4;

        // 1. Crear Fase de Grupos
        const phaseRes = await query(`
        INSERT INTO tournament_phases (tournament_id, name, type, sequence_order)
        VALUES ($1, 'Fase de Grupos', 'group', 1)
        RETURNING id
    `, [tournamentId]);
        const phaseId = phaseRes.rows[0].id;

        // 2. Obtener jugadores CONFIRMADOS (active o null status)
        const allPlayers = await getTournamentPlayers(tournamentId);
        const players = allPlayers.filter(p => p.status === 'active' || !p.status);

        if (players.length === 0) {
            throw new Error('No hay jugadores activos para generar grupos.');
        }

        // Calcular cantidad de grupos necesaria
        const groupCount = Math.ceil(players.length / groupSize);

        // Ordenar por Promedio General (Average) DESC
        const seededPlayers = players.sort((a, b) => {
            const avgA = parseFloat(a.average) || 0;
            const avgB = parseFloat(b.average) || 0;

            if (avgA !== avgB) return avgB - avgA; // Mayor promedio es mejor (Cabeza de serie)
            return a.id - b.id; // Desempate por registro
        });

        // 3. Crear Grupos con Horarios y Mesas (Numerados 1, 2, 3...)
        const groups = [];

        // Config de Agenda
        const tablesAvailable = tournament.tables_available || 4;
        const blockDuration = tournament.block_duration || 180; // Default 3h
        const startDate = new Date(tournament.start_date);

        for (let i = 0; i < groupCount; i++) {
            const groupName = (i + 1).toString();

            // Check for Override
            let startTime, tableNum;

            if (scheduleOverrides && scheduleOverrides[groupName]) {
                // Use Override
                // Override format expected: { startTime: ISOString, table: number }
                const override = scheduleOverrides[groupName];
                startTime = new Date(override.startTime);
                tableNum = parseInt(override.table);
            } else {
                // Default Logic
                const turnIndex = Math.floor(i / tablesAvailable);
                tableNum = (i % tablesAvailable) + 1;
                startTime = new Date(startDate.getTime() + (turnIndex * blockDuration * 60000));
            }

            const gRes = await query(`
            INSERT INTO tournament_groups (phase_id, name, start_time, table_assignment)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, [phaseId, groupName, startTime, tableNum]);
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
            const pCount = pIds.length;

            if (pCount < 2) continue; // Skip groups with 0 or 1 player (shouldn't happen ideally)

            // Special Case: 2 Players -> Double Match (Ida y Vuelta)
            if (pCount === 2) {
                // Match 1: P1 vs P2
                await query(`
                    INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number)
                    VALUES ($1, $2, $3, $4, $5, 'scheduled', 1)
                 `, [tournamentId, phaseId, groupId, pIds[0], pIds[1]]);

                // Match 2: P2 vs P1 (Vuelta)
                await query(`
                    INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number)
                    VALUES ($1, $2, $3, $4, $5, 'scheduled', 2)
                 `, [tournamentId, phaseId, groupId, pIds[1], pIds[0]]);

                continue;
            }

            // GSL Format (Double Elimination) - Only for 4 Players
            if (tournament.group_format === 'gsl' && pCount === 4) {
                // Match 1: Seed 1 vs Seed 4
                await query(`
                    INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number)
                    VALUES ($1, $2, $3, $4, $5, 'scheduled', 1)
                `, [tournamentId, phaseId, groupId, pIds[0], pIds[3]]);

                // Match 2: Seed 2 vs Seed 3
                await query(`
                    INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number)
                    VALUES ($1, $2, $3, $4, $5, 'scheduled', 1)
                `, [tournamentId, phaseId, groupId, pIds[1], pIds[2]]);

                // Match 3: Winners (TBD vs TBD) - Round 2
                await query(`
                    INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number)
                    VALUES ($1, $2, $3, NULL, NULL, 'scheduled', 2)
                `, [tournamentId, phaseId, groupId]);

                // Match 4: Losers (TBD vs TBD) - Round 2
                await query(`
                    INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number)
                    VALUES ($1, $2, $3, NULL, NULL, 'scheduled', 2)
                `, [tournamentId, phaseId, groupId]);

                // Match 5: Decider (TBD vs TBD) - Round 3
                await query(`
                    INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number)
                    VALUES ($1, $2, $3, NULL, NULL, 'scheduled', 3)
                `, [tournamentId, phaseId, groupId]);

                continue;
            }

            // Standard Round robin: todos contra todos
            for (let i = 0; i < pCount; i++) {
                for (let j = i + 1; j < pCount; j++) {
                    await query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, group_id, player1_id, player2_id, status, round_number)
                VALUES ($1, $2, $3, $4, $5, 'scheduled', 1)
            `, [tournamentId, phaseId, groupId, pIds[i], pIds[j]]);
                }
            }
        }

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true };
    } catch (e) {
        console.error('Error generating groups:', e);
        // Ensure we return a plain object failure, not rethrowing Error which gets masked by Next.js in production
        return { success: false, message: e.message };
    }
}

export async function previewGroups(tournamentId) {
    const tournament = await getTournament(tournamentId);
    const groupSize = tournament.group_size || 4;
    const players = await getTournamentPlayers(tournamentId);
    const activePlayers = players.filter(p => p.status === 'active' || !p.status);

    const groupCount = Math.ceil(activePlayers.length / groupSize);

    // Sort by Average (Seeding)
    // Modified: User requested sort by Average
    const seededPlayers = [...activePlayers].sort((a, b) => {
        const avgA = parseFloat(a.average) || 0;
        const avgB = parseFloat(b.average) || 0;

        if (avgA !== avgB) return avgB - avgA; // Higher Average first

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
        const checkMatches = await query('SELECT id FROM tournament_matches WHERE phase_id = $1 LIMIT 1', [existingPhase.rows[0].id]);
        if (checkMatches.rows.length > 0) {
            throw new Error('Ya existen playoffs generados');
        }
        // Empty phase found (likely from failed generation). Cleanup.
        await query('DELETE FROM tournament_phases WHERE id = $1', [existingPhase.rows[0].id]);
    }

    // 2. Get group results and stats
    const matches = await getMatches(tournamentId);
    const groups = {}; // groupId -> { players: { playerId: { points, sets, avg... } } }

    const initStats = () => ({ points: 0, innings: 0, score: 0, matches: 0, handicap: 0 });

    matches.filter(m => m.phase_type === 'group' && m.status === 'completed').forEach(m => {
        if (!groups[m.group_id]) groups[m.group_id] = {};
        const g = groups[m.group_id];

        if (!g[m.player1_id]) g[m.player1_id] = initStats();
        if (!g[m.player2_id]) g[m.player2_id] = initStats();

        const p1 = g[m.player1_id];
        const p2 = g[m.player2_id];

        // Capture handicap (use first available)
        if (!p1.handicap && m.player1_handicap) p1.handicap = m.player1_handicap;
        if (!p2.handicap && m.player2_handicap) p2.handicap = m.player2_handicap;

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

            const handicap = stats.handicap || 20;
            const factor = handicap > 0 ? 28 / handicap : 1;
            const weightedScore = stats.score * factor;
            const wAvg = stats.innings > 0 ? weightedScore / stats.innings : 0;

            return { pid: parseInt(pid), ...stats, avg, wAvg };
        })
            .sort((a, b) => {
                // Modified Sort for GSL: Prioritize efficiency
                if (tournament.group_format === 'gsl') {
                    if (b.points !== a.points) return b.points - a.points;
                    if (a.matches !== b.matches) return a.matches - b.matches;
                    return b.wAvg - a.wAvg; // Use Weighted Avg here too? Or General? specific to GSL rules.
                }
                // Standard Sort: Points -> Weighted Avg -> General Avg
                if (b.points !== a.points) return b.points - a.points;
                if (Math.abs(b.wAvg - a.wAvg) > 0.0001) return b.wAvg - a.wAvg;
                return b.avg - a.avg;
            });

        // Take qualifiersPerGroup
        for (let i = 0; i < qualifiersPerGroup; i++) {
            if (sorted[i]) {
                qualified.push({ ...sorted[i], rankInGroup: i + 1, groupId: gid });
            }
        }
    }

    if (qualified.length < 2) throw new Error('No hay suficientes partidos jugados para generar llaves');

    // Sort qualifiers for seeding
    // NEW LOGIC: Split 1sts and 2nds.
    // "Primero ordena los numero uno (16)... luego los segundos (16)"
    // "Empareja mejor primero con peor segundo" -> Handled by 1 vs 32 logic if list is ordered [1sts... , ...2nds]

    // Sort function
    const sortFn = (a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (Math.abs(b.wAvg - a.wAvg) > 0.0001) return b.wAvg - a.wAvg;
        return b.avg - a.avg;
    };

    const firsts = qualified.filter(q => q.rankInGroup === 1).sort(sortFn);
    const seconds = qualified.filter(q => q.rankInGroup === 2).sort(sortFn);
    // Handle 3rds etc if they exist (e.g. wildcards)? For now assume 1s and 2s based on user prompt.
    const others = qualified.filter(q => q.rankInGroup > 2).sort(sortFn);

    qualified = [...firsts, ...seconds, ...others];

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

        // Generate Seeding Indices (Standard Bracket / Snake)
        // Ensures 1 vs 32, 2 vs 31, etc. but distributed in bracket to avoid early finals.
        let seedIndices = [0, 1];
        while (seedIndices.length < size) {
            const nextRound = [];
            const nextSize = seedIndices.length * 2;
            for (const idx of seedIndices) {
                nextRound.push(idx);
                nextRound.push(nextSize - 1 - idx);
            }
            seedIndices = nextRound;
        }

        for (let i = 0; i < matchesToCreate; i++) {
            const idx1 = seedIndices[i * 2];
            const idx2 = seedIndices[i * 2 + 1];

            const p1 = qualified[idx1];
            const p2 = qualified[idx2];

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

export async function disqualifyPlayer(tournamentId, playerId) {
    const session = await getSession();
    const role = session?.role;
    if (role !== 'admin' && role !== 'superadmin' && role !== 'SUPERADMIN') {
        throw new Error('No autorizado: Solo los administradores pueden descalificar jugadores.');
    }

    try {
        await query('BEGIN');

        // 1. Mark player as disqualified
        await query(`
            UPDATE tournament_players 
            SET status = 'disqualified' 
            WHERE tournament_id = $1 AND id = $2
        `, [tournamentId, playerId]);

        // 2. Resolve future matches as WO
        // Need tournament limits for points
        const tournament = await getTournament(tournamentId);

        let pLimit = tournament.group_points_limit; // Default to group limit
        // Logic to distinguish phase type for limits? 
        // We can fetch phase info for each match, or simplified: use group limit for all if phase not checked.
        // Better: Check phase type of match.

        // Fetch all scheduled matches
        const matchesRequest = await query(`
            SELECT m.id, m.phase_id, m.player1_id, m.player2_id, p.type as phase_type
            FROM tournament_matches m
            JOIN tournament_phases p ON m.phase_id = p.id
            WHERE m.tournament_id = $1 
              AND (m.player1_id = $2 OR m.player2_id = $2)
              AND m.status = 'scheduled'
        `, [tournamentId, playerId]);

        const groupLimit = tournament.group_points_limit || 0;
        const playoffLimit = tournament.playoff_points_limit || 0;

        for (const match of matchesRequest.rows) {
            const winnerId = match.player1_id === playerId ? match.player2_id : match.player1_id;
            const targetPoints = match.phase_type === 'group' ? groupLimit : playoffLimit;

            // Determine Winner Score Position
            // If winner is P1
            const isWinnerP1 = match.player1_id === winnerId; // If disq player is P2
            const scoreP1 = isWinnerP1 ? targetPoints : 0;
            const scoreP2 = isWinnerP1 ? 0 : targetPoints;

            await query(`
                UPDATE tournament_matches
                SET status = 'completed', 
                    winner_id = $1, 
                    score_p1 = $2, 
                    score_p2 = $3,
                    win_reason = 'wo',
                    updated_at = NOW()
                WHERE id = $4
            `, [winnerId, scoreP1, scoreP2, match.id]);
        }

        await query('COMMIT');
        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, message: 'Jugador descalificado y partidos restantes marcados como W.O.' };
    } catch (e) {
        await query('ROLLBACK');
        console.error(e);
        return { success: false, message: 'Error al descalificar jugador' };
    }
}

// --- RESET FUNCTIONALITY ---

export async function purgeTournament(tournamentId) {
    try {
        await query('BEGIN');
        await query(`DELETE FROM tournament_matches WHERE tournament_id = $1`, [tournamentId]);
        await query(`DELETE FROM tournament_groups WHERE phase_id IN (SELECT id FROM tournament_phases WHERE tournament_id = $1)`, [tournamentId]);
        await query(`DELETE FROM tournament_phases WHERE tournament_id = $1`, [tournamentId]);
        await query('COMMIT');
        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, message: 'Fixture eliminado correctamente' };
    } catch (e) {
        await query('ROLLBACK');
        console.error(e);
        return { success: false, message: e.message };
    }
}

// --- REPARACIÓN GSL ---

export async function repairGSL(tournamentId) {
    try {
        const matches = await getMatches(tournamentId);
        // Filter completed group matches
        const completedGroupMatches = matches.filter(m => m.phase_type === 'group' && m.status === 'completed');

        // Group by group_id (only need one trigger match per group)
        const groupMap = new Map();
        completedGroupMatches.forEach(m => groupMap.set(m.group_id, m.id));

        const { checkGSLAdvancement } = await import('./gsl-logic');
        let count = 0;
        for (const [gid, mid] of groupMap) {
            await checkGSLAdvancement(mid);
            count++;
        }

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, message: `Reparación completada. Grupos revisados: ${count}` };
    } catch (e) {
        console.error("Error repairing GSL:", e);
        return { success: false, message: e.message };
    }
}

// --- GENERAR SIGUIENTE RONDA (PLAYOFFS) ---

export async function generateNextRound(tournamentId) {
    try {
        const phaseRes = await query(`
            SELECT id FROM tournament_phases 
            WHERE tournament_id = $1 AND type = 'elimination'
            ORDER BY sequence_order DESC LIMIT 1
        `, [tournamentId]);

        if (phaseRes.rows.length === 0) throw new Error('No hay fase de playoffs activa.');
        const phaseId = phaseRes.rows[0].id;

        const roundRes = await query(`
            SELECT MAX(round_number) as max_round 
            FROM tournament_matches 
            WHERE phase_id = $1
        `, [phaseId]);
        const currentRound = roundRes.rows[0].max_round || 1;

        const matchesRes = await query(`
            SELECT * FROM tournament_matches 
            WHERE phase_id = $1 AND round_number = $2
            ORDER BY id ASC
        `, [phaseId, currentRound]);

        const matches = matchesRes.rows;

        if (matches.length === 0) throw new Error('No hay partidos en la ronda actual.');

        const unfinished = matches.filter(m => m.status !== 'completed');
        if (unfinished.length > 0) {
            throw new Error(`Aún hay ${unfinished.length} partidos pendientes en esta ronda.`);
        }

        if (matches.length === 1) throw new Error('El torneo ya ha finalizado (Final jugada).');

        const winners = matches.map(m => {
            if (!m.winner_id) throw new Error(`El partido ${m.id} no tiene ganador.`);
            return { pid: m.winner_id };
        });

        const nextRound = currentRound + 1;
        const nextMatchesCount = winners.length / 2;

        await query('BEGIN');

        for (let i = 0; i < nextMatchesCount; i++) {
            const p1 = winners[i * 2];
            const p2 = winners[i * 2 + 1];

            await query(`
                INSERT INTO tournament_matches (tournament_id, phase_id, player1_id, player2_id, status, round_number)
                VALUES ($1, $2, $3, $4, 'scheduled', $5)
            `, [tournamentId, phaseId, p1.pid, p2.pid, nextRound]);
        }

        await query('COMMIT');
        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, message: `Ronda ${nextRound} generada con éxito (${nextMatchesCount} partidos).` };

    } catch (e) {
        await query('ROLLBACK');
        console.error(e);
        return { success: false, message: e.message };
    }
}


export async function assignTablesRandomly(tournamentId, tableCount) {
    try {
        const tournament = await getTournament(tournamentId);
        // Get active groups
        const groupsRes = await query(`
            SELECT g.id, g.name 
            FROM tournament_groups g
            JOIN tournament_phases p ON g.phase_id = p.id
            WHERE p.tournament_id = $1 AND p.type = 'group'
        `, [tournamentId]);

        const groups = groupsRes.rows;
        if (groups.length === 0) throw new Error('No hay grupos para asignar mesas.');

        // Logic: 
        // 1. Shuffle tables (1 to tableCount)
        // 2. Assign to groups. If groups > tables, rotate or error?
        // Usually rotate.

        const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

        // Fisher-Yates Shuffle
        for (let i = tables.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tables[i], tables[j]] = [tables[j], tables[i]];
        }

        // Assign to groups
        for (let i = 0; i < groups.length; i++) {
            const tableNum = tables[i % tables.length];
            await query(`UPDATE tournament_groups SET table_assignment = $1 WHERE id = $2`, [tableNum, groups[i].id]);

            // Also update matches for this group that are still pending/scheduled?
            // User requested lottery, usually meaning the group plays on that table.
            await query(`
                UPDATE tournament_matches 
                SET table_number = $1 
                WHERE group_id = $2 AND (status = 'scheduled' OR status = 'pending')
            `, [tableNum, groups[i].id]);
        }

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, message: `Mesas asignadas aleatoriamente a ${groups.length} grupos.` };

    } catch (e) {
        console.error(e);
        return { success: false, message: e.message };
    }
}

export async function updateMatchTable(matchId, tableNumber) {
    try {
        await query(`UPDATE tournament_matches SET table_number = $1 WHERE id = $2`, [tableNumber, matchId]);

        // Revalidate
        // finding tournament id first?
        const res = await query('SELECT tournament_id FROM tournament_matches WHERE id = $1', [matchId]);
        if (res.rows.length > 0) {
            revalidatePath(`/admin/tournaments/${res.rows[0].tournament_id}`);
        }
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

export async function swapPlayers(player1Id, player2Id, tournamentId) {
    try {
        console.log(`Swapping players: ${player1Id} <-> ${player2Id} in tournament ${tournamentId}`);
        await query('BEGIN');

        await query(`
            UPDATE tournament_matches
            SET 
                player1_id = CASE 
                    WHEN player1_id = $1 THEN $2 
                    WHEN player1_id = $2 THEN $1 
                    ELSE player1_id 
                END,
                player2_id = CASE 
                    WHEN player2_id = $1 THEN $2 
                    WHEN player2_id = $2 THEN $1 
                    ELSE player2_id 
                END
            WHERE tournament_id = $3 AND (player1_id IN ($1, $2) OR player2_id IN ($1, $2))
        `, [player1Id, player2Id, tournamentId]);

        await query('COMMIT');
        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, message: 'Jugadores intercambiados con éxito.' };

    } catch (e) {
        await query('ROLLBACK');
        console.error(e);
        return { success: false, message: 'Error al intercambiar: ' + e.message };
    }
}

export async function recalculateAllHandicaps(tournamentId) {
    try {
        console.log(`Recalculating handicaps for tournament ${tournamentId}`);
        const players = await getTournamentPlayers(tournamentId);
        let updatedCount = 0;

        for (const p of players) {
            const newHandicap = calculateFechillarHandicap(parseFloat(p.average || 0));
            if (newHandicap !== p.handicap) {
                await query('UPDATE tournament_players SET handicap = $1 WHERE id = $2', [newHandicap, p.id]);
                updatedCount++;
            }
        }

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, message: `Se recalcularon ${updatedCount} handicaps.` };
    } catch (e) {
        console.error(e);
        return { success: false, message: e.message };
    }
}
