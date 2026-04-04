'use server';

import prisma from './prisma';
import { revalidatePath } from 'next/cache';
import { saveFile } from './upload-utils';
import { calculateFechillarHandicap } from '@/app/lib/utils';
import { getSession } from '@/app/lib/session';


// --- TORNEOS ---

export async function getTournaments() {
    // El tenantId se inyecta automáticamente gracias a la extensión de Prisma
    return await prisma.tournament.findMany({
        orderBy: { startDate: 'desc' }
    });
}

export async function getTournament(id) {
    // Ya no necesitamos WHERE tenantId manual
    return await prisma.tournament.findUnique({
        where: { id: parseInt(id) },
        include: {
            hostClub: {
                select: {
                    logoUrl: true,
                    city: true,
                    country: true
                }
            }
        }
    });
}

// Moved to top
export async function createTournament(formData) {
    try {
        // Extract data from FormData
        // Extended Logging
        console.log('createTournament called with formData');

        // Extract data with SAFE parsing
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

        const host_club_id = safeInt(formData.get('host_club_id'));
        const discipline = formData.get('discipline') || null;
        let tables_available = safeInt(formData.get('tables_available'), 4);
        const group_format = formData.get('group_format') || 'round_robin';
        const is_official = formData.get('is_official') === 'on';

        const footer_branding_title = formData.get('footer_branding_title');
        const footer_branding_subtitle = formData.get('footer_branding_subtitle');
        const footer_info_text = formData.get('footer_info_text');
        const footer_center_title = formData.get('footer_center_title');

        // File Uploads
        let banner_image_url = formData.get('banner_image_url') || null;
        let logo_image_url = formData.get('logo_image_url') || null;
        let branding_image_url = formData.get('branding_image_url') || null;

        const bannerFile = formData.get('banner_image');
        const logoFile = formData.get('logo_image');
        const brandingFile = formData.get('branding_image');

        if (process.env.BLOB_READ_WRITE_TOKEN) {
            if (!banner_image_url && bannerFile && bannerFile.size > 0) banner_image_url = await saveFile(bannerFile, 'tournaments');
            if (!logo_image_url && logoFile && logoFile.size > 0) logo_image_url = await saveFile(logoFile, 'tournaments');
            if (!branding_image_url && brandingFile && brandingFile.size > 0) branding_image_url = await saveFile(brandingFile, 'tournaments');
        }

        const newTournament = await prisma.tournament.create({
            data: {
                name,
                startDate: new Date(start_date),
                endDate: end_date ? new Date(end_date) : null,
                maxPlayers: max_players,
                format,
                groupSize: group_size,
                shotClockSeconds: shot_clock_seconds,
                groupPointsLimit: group_points_limit,
                groupInningsLimit: group_innings_limit,
                playoffPointsLimit: playoff_points_limit,
                playoffInningsLimit: playoff_innings_limit,
                useHandicap: use_handicap,
                blockDuration: block_duration,
                semifinalPointsLimit: semifinal_points_limit,
                semifinalInningsLimit: semifinal_innings_limit,
                finalPointsLimit: final_points_limit,
                finalInningsLimit: final_innings_limit,
                playoffTargetSize: playoff_target_size,
                qualifiersPerGroup: qualifiers_per_group,
                hostClubId: host_club_id,
                discipline,
                tablesAvailable: tables_available,
                groupFormat: group_format,
                isOfficial: is_official,
                footerBrandingTitle: footer_branding_title,
                footerBrandingSubtitle: footer_branding_subtitle,
                footerInfoText: footer_info_text,
                footerCenterTitle: footer_center_title,
                bannerImageUrl: banner_image_url,
                logoImageUrl: logo_image_url,
                brandingImageUrl: branding_image_url
            }
        });

        revalidatePath('/tournaments');
        revalidatePath('/admin/tournaments');

        return { success: true, id: newTournament.id };
    } catch (e) {
        console.error("Error creating tournament:", e);
        return { success: false, message: e.message || 'Error desconocido al crear torneo' };
    }
}

export async function updateTournament(id, formData) {
    try {
        const safeInt = (val, fallback = null) => {
            const parsed = parseInt(val);
            return isNaN(parsed) ? fallback : parsed;
        };

        const data = {
            name: formData.get('name'),
            startDate: new Date(formData.get('start_date')),
            endDate: formData.get('end_date') ? new Date(formData.get('end_date')) : null,
            maxPlayers: safeInt(formData.get('max_players')),
            format: formData.get('format'),
            groupSize: safeInt(formData.get('group_size')),
            shotClockSeconds: safeInt(formData.get('shot_clock_seconds'), 40),
            groupPointsLimit: safeInt(formData.get('group_points_limit')),
            groupInningsLimit: safeInt(formData.get('group_innings_limit')),
            playoffPointsLimit: safeInt(formData.get('playoff_points_limit')),
            playoffInningsLimit: safeInt(formData.get('playoff_innings_limit')),
            useHandicap: formData.get('use_handicap') === 'true',
            blockDuration: safeInt(formData.get('block_duration')),
            tablesAvailable: safeInt(formData.get('tables_available'), 4),
            hostClubId: safeInt(formData.get('host_club_id')),
            discipline: formData.get('discipline'),
            groupFormat: formData.get('group_format'),
            isOfficial: formData.get('is_official') === 'on',
            footerBrandingTitle: formData.get('footer_branding_title'),
            footerBrandingSubtitle: formData.get('footer_branding_subtitle'),
            footerCenterTitle: formData.get('footer_center_title'),
            footerInfoText: formData.get('footer_info_text'),
            semifinalPointsLimit: safeInt(formData.get('semifinal_points_limit')),
            semifinalInningsLimit: safeInt(formData.get('semifinal_innings_limit')),
            finalPointsLimit: safeInt(formData.get('final_points_limit')),
            finalInningsLimit: safeInt(formData.get('final_innings_limit')),
            playoffTargetSize: safeInt(formData.get('playoff_target_size')),
            qualifiersPerGroup: safeInt(formData.get('qualifiers_per_group')),
        };

        // Handle Image Updates
        const bannerFile = formData.get('banner_image');
        if (bannerFile && bannerFile.size > 0) data.bannerImageUrl = await saveFile(bannerFile, 'tournaments');
        
        const logoFile = formData.get('logo_image');
        if (logoFile && logoFile.size > 0) data.logoImageUrl = await saveFile(logoFile, 'tournaments');

        const brandingFile = formData.get('branding_image');
        if (brandingFile && brandingFile.size > 0) data.brandingImageUrl = await saveFile(brandingFile, 'tournaments');

        await prisma.tournament.update({
            where: { id: parseInt(id) },
            data
        });

        revalidatePath('/tournaments');
        revalidatePath(`/admin/tournaments/${id}`);
        return { success: true };
    } catch (e) {
        console.error("Error updating tournament:", e);
        return { success: false, message: e.message };
    }
}

export async function deleteTournament(id) {
    try {
        await prisma.tournament.delete({
            where: { id: parseInt(id) }
        });

        revalidatePath('/tournaments');
        revalidatePath('/admin');
        revalidatePath('/admin/tournaments');
        return { success: true };
    } catch (e) {
        console.error("Error deleting tournament:", e);
        return { success: false, message: 'Error al eliminar el torneo' };
    }
}

// --- JUGADORES ---

export async function getTournamentPlayers(tournamentId) {
    return await prisma.tournamentPlayer.findMany({
        where: { tournamentId: parseInt(tournamentId) },
        include: {
            player: {
                select: {
                    photoUrl: true
                }
            }
        },
        orderBy: { playerName: 'asc' }
    });
}

// Helper to get club name if ID provided
async function resolveClubName(clubId, providedName) {
    if (clubId) {
        const club = await prisma.club.findUnique({
            where: { id: parseInt(clubId) },
            select: { name: true }
        });
        if (club) return club.name;
    }
    return providedName;
}

// Global Ranking
export async function getGlobalRanking() {
    return await prisma.player.findMany({
        where: {
            ranking: { gt: 0 }
        },
        include: {
            club: {
                select: { name: true }
            }
        },
        orderBy: [
            { ranking: 'asc' },
            { name: 'asc' }
        ]
    });
}



export async function registerPlayer(tournamentId, formData) {
    try {
        const player_name = formData.get('player_name');
        let team_name = formData.get('team_name'); // Fallback text
        const club_id = formData.get('club_id') ? parseInt(formData.get('club_id')) : null;
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
        const tour = await getTournament(tournamentId);

        // Auto-Calculate Handicap if enabled
        if (tour.useHandicap) {
            handicap = calculateFechillarHandicap(average);
        }

        const players = await getTournamentPlayers(tournamentId);

        // Contar solo jugadores activos
        const activePlayers = players.filter(p => p.status === 'active' || !p.status);

        let status = 'active';
        let warningMessage = null;

        if (tour.maxPlayers && activePlayers.length >= tour.maxPlayers) {
            status = 'waitlist';
            warningMessage = 'Torneo lleno. Registrado en Lista de Espera.';
        }

        // Global Player Logic (Upsert)
        let playerId = null;
        const cleanName = player_name.trim();

        // 1. Check existing player
        let existingPlayer = null;
        if (identification) {
            existingPlayer = await prisma.player.findUnique({
                where: { identification }
            });
        }
        
        if (!existingPlayer) {
            existingPlayer = await prisma.player.findFirst({
                where: { name: { equals: cleanName, mode: 'insensitive' } }
            });
        }

        // 2. Create or Update Global Player
        const playerData = {
            name: cleanName,
            identification,
            average,
            clubId: club_id,
        };
        if (photo_url) playerData.photoUrl = photo_url;

        if (existingPlayer) {
            playerId = existingPlayer.id;
            await prisma.player.update({
                where: { id: playerId },
                data: playerData
            });
        } else {
            const newPlayer = await prisma.player.create({
                data: playerData
            });
            playerId = newPlayer.id;
        }

        // 3. Register in Tournament
        await prisma.tournamentPlayer.create({
            data: {
                tournamentId: parseInt(tournamentId),
                playerName: cleanName,
                teamName: team_name,
                handicap,
                average,
                status,
                playerId
            }
        });

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        revalidatePath(`/tournaments/${tournamentId}`);

        return { success: true, warning: warningMessage };
    } catch (e) {
        console.error("Error in registerPlayer:", e);
        return { success: false, message: e.message || 'Error desconocido al registrar jugador' };
    }
}


export async function registerBatchPlayers(tournamentId, playerIds) {
    try {
        if (!playerIds || playerIds.length === 0) return { success: false, message: 'No se seleccionaron jugadores.' };

        const tournament = await getTournament(tournamentId);
        if (!tournament) return { success: false, message: 'Torneo no encontrado.' };

        // 1. Get Details for selected players
        const selectedPlayers = await prisma.player.findMany({
            where: { id: { in: playerIds } },
            include: { club: { select: { name: true } } }
        });

        // 2. Count current active players
        const currentActiveCount = await prisma.tournamentPlayer.count({
            where: { 
                tournamentId: parseInt(tournamentId),
                status: { in: ['active', null] }
            }
        });

        let activeIndex = currentActiveCount;
        const maxPlayersCapacity = tournament.maxPlayers || 9999;
        let count = 0;
        let errors = 0;

        // 3. Iterate and Insert
        for (const p of selectedPlayers) {
            try {
                // Check if already in tournament
                const existing = await prisma.tournamentPlayer.findFirst({
                    where: { 
                        tournamentId: parseInt(tournamentId),
                        playerId: p.id
                    }
                });

                if (existing) continue;

                // Determine status based on capacity
                let status = 'active';
                if (activeIndex >= maxPlayersCapacity) {
                    status = 'waitlist';
                } else {
                    activeIndex++;
                }

                // Calc handicap
                let handicap = 0;
                if (tournament.useHandicap) {
                    handicap = calculateFechillarHandicap(p.average || 0);
                }

                // Insert
                await prisma.tournamentPlayer.create({
                    data: {
                        tournamentId: parseInt(tournamentId),
                        playerName: p.name,
                        teamName: p.club?.name || 'Sin Club',
                        handicap,
                        playerId: p.id,
                        status,
                        average: p.average || 0
                    }
                });

                count++;
            } catch (err) {
                console.error(`Error adding player ${p.name}:`, err);
                errors++;
            }
        }

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { 
            success: true, 
            count, 
            message: `Agregados ${count} jugadores.` + (errors > 0 ? ` (${errors} errores)` : '') 
        };

    } catch (e) {
        console.error("Batch Register Error:", e);
        return { success: false, message: e.message };
    }
}

// Actions for Group Management


export async function replaceWithWaitlist(originalPlayerId, tournamentId) {
    try {
        // 1. Find FIFO waitlist player
        const replacement = await prisma.tournamentPlayer.findFirst({
            where: {
                tournamentId: parseInt(tournamentId),
                status: 'waitlist'
            },
            orderBy: { id: 'asc' }
        });

        if (!replacement) {
            return { success: false, message: 'No hay jugadores en lista de espera' };
        }

        // 2. Transaction for updates
        await prisma.$transaction([
            // Update matches of original player to use replacement (player1)
            prisma.tournamentMatch.updateMany({
                where: {
                    tournamentId: parseInt(tournamentId),
                    player1Id: parseInt(originalPlayerId),
                    status: 'scheduled'
                },
                data: { player1Id: replacement.id }
            }),
            // Update matches of original player to use replacement (player2)
            prisma.tournamentMatch.updateMany({
                where: {
                    tournamentId: parseInt(tournamentId),
                    player2Id: parseInt(originalPlayerId),
                    status: 'scheduled'
                },
                data: { player2Id: replacement.id }
            }),
            // Update Statuses
            prisma.tournamentPlayer.update({
                where: { id: parseInt(originalPlayerId) },
                data: { status: 'eliminated' }
            }),
            prisma.tournamentPlayer.update({
                where: { id: replacement.id },
                data: { status: 'active' }
            })
        ]);

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, message: `Jugador reemplazado por ${replacement.playerName}` };
    } catch (e) {
        console.error("Error in replaceWithWaitlist:", e);
        return { success: false, message: 'Error al reemplazar jugador' };
    }
}

export async function updatePlayer(tournamentPlayerId, formData) {
    try {
        const playerName = formData.get('player_name');
        const teamName = formData.get('team_name');
        const clubId = formData.get('club_id') ? parseInt(formData.get('club_id')) : null;
        const identification = formData.get('identification');
        const handicap = Number(formData.get('handicap'));
        const average = parseFloat(formData.get('average') || '0');

        // 1. Update Tournament Player (specific to this tournament)
        const tp = await prisma.tournamentPlayer.update({
            where: { id: parseInt(tournamentPlayerId) },
            data: {
                playerName,
                teamName,
                handicap,
                average
            }
        });

        // 2. Update Global Player if linked
        if (tp.playerId) {
            const photoFile = formData.get('photo');
            let photoUrl = null;
            if (photoFile && photoFile.size > 0) {
                photoUrl = await saveFile(photoFile, 'players');
            }

            const globalData = {
                name: playerName,
                identification,
                average,
                clubId
            };
            if (photoUrl) globalData.photoUrl = photoUrl;

            await prisma.player.update({
                where: { id: tp.playerId },
                data: globalData
            });
        }

        revalidatePath(`/admin/tournaments/${tp.tournamentId}`);
        return { success: true };
    } catch (e) {
        console.error("Error in updatePlayer:", e);
        return { success: false, message: 'Error al actualizar jugador' };
    }
}




export async function removePlayer(tournamentId, playerId) {
    const { getClient } = await import('./db.js');
    const client = await getClient();
    
    try {
        await client.query('BEGIN');
        
        // Delete player
        await client.query('DELETE FROM tournament_players WHERE id = $1 AND tournament_id = $2', [playerId, tournamentId]);

        const tourRes = await client.query('SELECT max_players FROM tournaments WHERE id = $1', [tournamentId]);
        const tour = tourRes.rows[0];

        if (tour && tour.max_players) {
            const remainingRes = await client.query(`SELECT COUNT(*) as c FROM tournament_players WHERE tournament_id = $1 AND (status = 'active' OR status IS NULL)`, [tournamentId]);
            const activeCount = parseInt(remainingRes.rows[0].c);

            if (activeCount < tour.max_players) {
                const waitlistRes = await client.query(`
                    SELECT * FROM tournament_players 
                    WHERE tournament_id = $1 AND status = 'waitlist'
                    ORDER BY id ASC 
                    LIMIT 1
                `, [tournamentId]);

                if (waitlistRes.rows.length > 0) {
                    const nextPlayer = waitlistRes.rows[0];
                    await client.query(`UPDATE tournament_players SET status = 'active' WHERE id = $1`, [nextPlayer.id]);
                }
            }
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("=== DELETE PLAYER ERROR ===", e);
        throw new Error('Error eliminando jugador: ' + (e.message || 'Error de base de datos'));
    } finally {
        client.release();
    }
    
    const { revalidatePath } = await import('next/cache');
    revalidatePath(`/admin/tournaments/${tournamentId}`);
    return { success: true };
}

export async function removePlayers(tournamentId, playerIds) {
    if (!playerIds || playerIds.length === 0) return { success: true };

    const { getClient } = await import('./db.js');
    const client = await getClient();

    try {
        await client.query('BEGIN');
        
        // 1. Delete all selected players
        await client.query(`
            DELETE FROM tournament_players 
            WHERE tournament_id = $1 AND id = ANY($2)
        `, [tournamentId, playerIds]);

        // 2. Waitlist Promotion Logic
        const tourRes = await client.query('SELECT max_players FROM tournaments WHERE id = $1', [tournamentId]);
        const tour = tourRes.rows[0];

        if (tour && tour.max_players) {
            const remainingRes = await client.query(`
                SELECT COUNT(*) as count FROM tournament_players 
                WHERE tournament_id = $1 AND (status = 'active' OR status IS NULL)
            `, [tournamentId]);
            const activeCount = parseInt(remainingRes.rows[0].count);

            const spotsAvailable = tour.max_players - activeCount;

            if (spotsAvailable > 0) {
                const waitlistRes = await client.query(`
                    SELECT id FROM tournament_players 
                    WHERE tournament_id = $1 AND status = 'waitlist'
                    ORDER BY id ASC 
                    LIMIT $2
                `, [tournamentId, spotsAvailable]);

                for (const row of waitlistRes.rows) {
                    await client.query(`UPDATE tournament_players SET status = 'active' WHERE id = $1`, [row.id]);
                }
            }
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("=== BULK DELETE PLAYERS ERROR ===", e);
        throw new Error('Error eliminando jugadores seleccionados: ' + (e.message || 'Error de BD'));
    } finally {
        client.release();
    }
    
    const { revalidatePath } = await import('next/cache');
    revalidatePath(`/admin/tournaments/${tournamentId}`);
    return { success: true };
}

export async function searchPlayers(term) {
    if (!term || term.length < 2) return [];
    return await prisma.player.findMany({
        where: {
            name: {
                contains: term,
                mode: 'insensitive'
            }
        },
        orderBy: { name: 'asc' },
        take: 10
    });
}

// --- CLUB MANAGEMENT ---

export async function getClubs() {
    return await prisma.club.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function getClub(id) {
    return await prisma.club.findUnique({
        where: { id: parseInt(id) }
    });
}




export async function getClubBySlug(slug) {
    return await prisma.club.findUnique({
        where: { slug }
    });
}

export async function getPlayersByClub(clubId) {
    return await prisma.player.findMany({
        where: { clubId: parseInt(clubId) },
        orderBy: [
            { ranking: 'asc' },
            { name: 'asc' }
        ]
    });
}

export async function createClub(formData) {
    try {
        const name = formData.get('name');
        const shortName = formData.get('short_name');
        const country = formData.get('country');
        const city = formData.get('city');
        const address = formData.get('address');
        const slug = formData.get('slug') || name.toLowerCase().replace(/ /g, '-');

        const tablesBillar = parseInt(formData.get('tables_billar') || '0');
        const tablesPool = parseInt(formData.get('tables_pool') || '0');
        const tablesBola9 = parseInt(formData.get('tables_bola9') || '0');
        const tablesSnooker = parseInt(formData.get('tables_snooker') || '0');
        const locationUrl = formData.get('location_url_external') || null;

        let logoUrl = formData.get('logo_url') || null;
        const logo = formData.get('logo');
        if (!logoUrl && logo && logo.size > 0) {
            logoUrl = await saveFile(logo, 'clubs');
        }

        const club = await prisma.club.create({
            data: {
                name,
                shortName,
                country,
                city,
                address,
                slug,
                tablesBillar,
                tablesPool,
                tablesBola9,
                tablesSnooker,
                logoUrl,
                locationUrl
            }
        });

        revalidatePath('/admin/clubs');
        return { success: true, club };
    } catch (e) {
        console.error('Error in createClub:', e);
        return { success: false, message: e.message };
    }
}

export async function updateClub(id, formData) {
    try {
        const name = formData.get('name');
        const shortName = formData.get('short_name');
        const country = formData.get('country');
        const city = formData.get('city');
        const address = formData.get('address');
        const tablesBillar = parseInt(formData.get('tables_billar') || '0');
        const tablesPool = parseInt(formData.get('tables_pool') || '0');
        const tablesBola9 = parseInt(formData.get('tables_bola9') || '0');
        const tablesSnooker = parseInt(formData.get('tables_snooker') || '0');
        const locationUrl = formData.get('location_url_external') || null;

        let logoUrl = formData.get('logo_url') || null;
        const logo = formData.get('logo');
        if (!logoUrl && logo && logo.size > 0) {
            logoUrl = await saveFile(logo, 'clubs');
        }

        const data = {
            name,
            shortName,
            country,
            city,
            address,
            tablesBillar,
            tablesPool,
            tablesBola9,
            tablesSnooker,
            locationUrl
        };
        if (logoUrl) data.logoUrl = logoUrl;

        const club = await prisma.club.update({
            where: { id: parseInt(id) },
            data
        });

        revalidatePath('/admin/clubs');
        return club;
    } catch (e) {
        console.error('Error in updateClub:', e);
        return { success: false, message: e.message };
    }
}

export async function deleteClub(id) {
    try {
        await prisma.club.delete({
            where: { id: parseInt(id) }
        });
        revalidatePath('/admin/clubs');
        return { success: true };
    } catch (e) {
        console.error('Error in deleteClub:', e);
        throw new Error('No se puede eliminar club con jugadores u otras dependencias');
    }
}

// --- GLOBAL PLAYER MANAGEMENT ---

export async function getGlobalPlayers() {
    return await prisma.player.findMany({
        include: {
            club: {
                select: { name: true }
            }
        },
        orderBy: { name: 'asc' }
    });
}

export async function createGlobalPlayer(formData) {
    const session = await getSession();
    if (!session || !session.userId) {
        throw new Error('No autorizado');
    }

    const name = formData.get('name');
    const clubId = formData.get('club_id') ? parseInt(formData.get('club_id')) : null;
    const identification = formData.get('identification') || null;

    let photoUrl = formData.get('photo_url') || null;
    const photoFile = formData.get('photo');
    if (!photoUrl && photoFile && photoFile.size > 0) {
        photoUrl = await saveFile(photoFile, 'players');
    }

    const player = await prisma.player.create({
        data: {
            name,
            clubId,
            identification,
            photoUrl
        }
    });

    revalidatePath('/admin/players');
    return player;
}

export async function updateGlobalPlayer(id, formData) {
    const session = await getSession();
    const role = session?.role;
    const allowedRoles = ['admin', 'superadmin', 'SUPERADMIN'];
    if (!allowedRoles.includes(role)) {
        throw new Error('No autorizado: Solo los administradores pueden editar jugadores.');
    }

    const name = formData.get('name');
    const clubId = formData.get('club_id') ? parseInt(formData.get('club_id')) : null;
    const identification = formData.get('identification') || null;

    let photoUrl = formData.get('photo_url') || null;
    const photoFile = formData.get('photo');
    if (!photoUrl && photoFile && photoFile.size > 0) {
        photoUrl = await saveFile(photoFile, 'players');
    }

    const data = {
        name,
        clubId,
        identification
    };
    if (photoUrl) data.photoUrl = photoUrl;

    const player = await prisma.player.update({
        where: { id },
        data
    });

    revalidatePath('/admin/players');
    return player;
}

export async function deleteGlobalPlayer(id) {
    const session = await getSession();
    const role = session?.role;
    const allowedRoles = ['admin', 'superadmin', 'SUPERADMIN', 'creator', 'Creator'];
    if (!allowedRoles.includes(role)) {
        return { error: `No autorizado: Tu rol (${role}) no tiene permisos para eliminar jugadores.` };
    }

    try {
        await prisma.player.delete({
            where: { id }
        });
        revalidatePath('/admin/players');
        return { success: true };
    } catch (e) {
        console.error('Error deleting player:', e);
        return { error: 'No se puede eliminar: El jugador está participando en torneos. Usa "Forzar Eliminación" para borrarlo completamente.' };
    }
}

export async function forceDeleteGlobalPlayer(id) {
    const session = await getSession();
    const role = session?.role;
    const allowedRoles = ['SUPERADMIN', 'superadmin'];
    if (!allowedRoles.includes(role)) {
        return { error: 'Acción restringida: Solo el Superadministrador puede forzar la eliminación.' };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Get all tournament_players records for this global player
            const tps = await tx.tournamentPlayer.findMany({
                where: { playerId: id },
                select: { id: true }
            });
            const tpIds = tps.map(r => r.id);

            if (tpIds.length > 0) {
                // 2. Nullify winner references in matches
                await tx.tournamentMatch.updateMany({
                    where: { winnerId: { in: tpIds } },
                    data: { winnerId: null }
                });

                // 3. Delete tournament_players records
                await tx.tournamentPlayer.deleteMany({
                    where: { playerId: id }
                });
            }

            // 4. Finally delete the global player
            await tx.player.delete({
                where: { id }
            });
        });

        revalidatePath('/admin/players');
        return { success: true };
    } catch (e) {
        console.error("Force Delete Error:", e);
        return { error: 'Error al forzar eliminación: ' + e.message };
    }
}
export async function deleteGlobalPlayers(ids) {
    const session = await getSession();
    const role = session?.role;
    const allowedRoles = ['SUPERADMIN', 'superadmin'];
    if (!allowedRoles.includes(role)) {
        return { error: 'Acción restringida: Solo el Superadministrador puede eliminar jugadores en masa.' };
    }

    if (!ids || ids.length === 0) return { success: true, count: 0 };

    try {
        const deleted = await prisma.player.deleteMany({
            where: { id: { in: ids } }
        });
        revalidatePath('/admin/players');
        return { success: true, count: deleted.count };
    } catch (e) {
        console.error('Error deleting players:', e);
        return { error: 'No se pueden eliminar algunos jugadores porque están participando en torneos.' };
    }
}

// --- FASES Y PARTIDAS ---

export async function getTournamentPhases(tournamentId) {
    return await prisma.tournamentPhase.findMany({
        where: { tournamentId: parseInt(tournamentId) },
        orderBy: { sequenceOrder: 'asc' }
    });
}

export async function getMatches(tournamentId) {
    // Obtenemos partidos con nombres de jugadores resueltos
    const matches = await prisma.tournamentMatch.findMany({
        where: { tournamentId: parseInt(tournamentId) },
        include: {
            player1: true,
            player2: true,
            group: {
                select: {
                    name: true,
                    startTime: true,
                    tableAssignment: true
                }
            },
            phase: {
                select: {
                    name: true,
                    type: true,
                    sequenceOrder: true
                }
            },
            tournament: {
                select: {
                    useHandicap: true
                }
            }
        },
        orderBy: [
            { phase: { sequenceOrder: 'asc' } },
            { group: { name: 'asc' } },
            { tableNumber: 'asc' }
        ]
    });

    // Mapear al formato esperado por el frontend si es necesario
    return matches.map(m => ({
        ...m,
        player1_name: m.player1?.playerName,
        player1_handicap: m.player1?.handicap,
        player1_team: m.player1?.teamName,
        player2_name: m.player2?.playerName,
        player2_handicap: m.player2?.handicap,
        player2_team: m.player2?.teamName,
        group_name: m.group?.name,
        group_start_time: m.group?.startTime,
        group_table: m.group?.tableAssignment,
        phase_name: m.phase?.name,
        phase_type: m.phase?.type,
        use_handicap: m.tournament?.useHandicap
    }));
}

export async function getRecentMatches(limit = 5) {
    const matches = await prisma.tournamentMatch.findMany({
        where: { status: 'completed' },
        include: {
            player1: { select: { playerName: true } },
            player2: { select: { playerName: true } },
            tournament: { select: { name: true } }
        },
        orderBy: { id: 'desc' },
        take: limit
    });

    return matches.map(m => ({
        ...m,
        player1_name: m.player1?.playerName,
        player2_name: m.player2?.playerName,
        tournament_name: m.tournament?.name
    }));
}

export async function updateMatchResult(matchId, data) {
    const { score_p1, score_p2, innings, high_run_p1, high_run_p2, winner_id } = data;

    try {
        const match = await prisma.tournamentMatch.update({
            where: { id: parseInt(matchId) },
            data: {
                scoreP1: parseInt(score_p1),
                scoreP2: parseInt(score_p2),
                innings: parseInt(innings),
                highRunP1: parseInt(high_run_p1),
                highRunP2: parseInt(high_run_p2),
                winnerId: winner_id ? parseInt(winner_id) : null,
                status: 'completed'
            }
        });

        revalidatePath(`/tournaments/${match.tournamentId}`);
        revalidatePath(`/admin/tournaments/${match.tournamentId}`);

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
    } catch (e) {
        console.error("Error updating match result:", e);
        throw e;
    }
}

// --- LOGICA DE GENERACION (Simplificada por ahora) ---

export async function generateGroups(tournamentId, scheduleOverrides = {}) {
    try {
        const tid = parseInt(tournamentId);
        const tournament = await prisma.tournament.findUnique({
            where: { id: tid }
        });

        if (!tournament) throw new Error('Torneo no encontrado');

        // 0. Verificar si ya hay fase de grupos
        const phasesCount = await prisma.tournamentPhase.count({
            where: { tournamentId: tid }
        });
        if (phasesCount > 0) {
            throw new Error('El fixture ya ha sido generado. Elimina las fases existentes para regenerar.');
        }

        const groupSize = tournament.groupSize || 4;

        // 2. Obtener jugadores CONFIRMADOS
        const allPlayers = await getTournamentPlayers(tournamentId);
        const players = allPlayers.filter(p => p.status === 'active' || !p.status);

        if (players.length === 0) {
            throw new Error('No hay jugadores activos para generar grupos.');
        }

        const groupCount = Math.ceil(players.length / groupSize);

        // Ordenar por Promedio (Seeding)
        const seededPlayers = [...players].sort((a, b) => {
            const avgA = parseFloat(a.average) || 0;
            const avgB = parseFloat(b.average) || 0;
            if (avgA !== avgB) return avgB - avgA;
            return a.id - b.id;
        });

        await prisma.$transaction(async (tx) => {
            // 1. Crear Fase de Grupos
            const phase = await tx.tournamentPhase.create({
                data: {
                    tournamentId: tid,
                    name: 'Fase de Grupos',
                    type: 'group',
                    sequenceOrder: 1
                }
            });

            const groups = [];
            const tablesAvailable = tournament.tablesAvailable || 4;
            const blockDuration = tournament.blockDuration || 180;
            const startDate = new Date(tournament.startDate);

            for (let i = 0; i < groupCount; i++) {
                const groupName = (i + 1).toString();
                let startTime, tableNum;

                if (scheduleOverrides && scheduleOverrides[groupName]) {
                    const override = scheduleOverrides[groupName];
                    startTime = new Date(override.startTime);
                    tableNum = parseInt(override.table);
                } else {
                    const turnIndex = Math.floor(i / tablesAvailable);
                    tableNum = (i % tablesAvailable) + 1;
                    startTime = new Date(startDate.getTime() + (turnIndex * blockDuration * 60000));
                }

                const group = await tx.tournamentGroup.create({
                    data: {
                        phaseId: phase.id,
                        name: groupName,
                        startTime,
                        tableAssignment: tableNum
                    }
                });
                groups.push(group);
            }

            // 4. Asignar jugadores (Snake System)
            const groupAssignments = {};
            groups.forEach(g => groupAssignments[g.id] = []);

            seededPlayers.forEach((p, idx) => {
                const cycle = Math.floor(idx / groupCount);
                const isZigZag = cycle % 2 === 1;
                let targetGroupIdx;
                if (isZigZag) {
                    targetGroupIdx = (groupCount - 1) - (idx % groupCount);
                } else {
                    targetGroupIdx = idx % groupCount;
                }
                groupAssignments[groups[targetGroupIdx].id].push(p.id);
            });

            // Generar partidos por grupo
            for (const group of groups) {
                const pIds = groupAssignments[group.id];
                const pCount = pIds.length;
                if (pCount < 2) continue;

                if (pCount === 2) {
                    await tx.tournamentMatch.create({
                        data: {
                            tournamentId: tid,
                            phaseId: phase.id,
                            groupId: group.id,
                            player1Id: pIds[0],
                            player2Id: pIds[1],
                            status: 'scheduled',
                            roundNumber: 1
                        }
                    });
                    continue;
                }

                if (pCount === 3) {
                    // Match 1: P2 vs P3
                    await tx.tournamentMatch.create({
                        data: {
                            tournamentId: tid, phaseId: phase.id, groupId: group.id,
                            player1Id: pIds[1], player2Id: pIds[2],
                            status: 'scheduled', roundNumber: 1
                        }
                    });
                    // Seed 1 vs P2 (R2)
                    await tx.tournamentMatch.create({
                        data: {
                            tournamentId: tid, phaseId: phase.id, groupId: group.id,
                            player1Id: pIds[0], player2Id: pIds[1],
                            status: 'scheduled', roundNumber: 2
                        }
                    });
                    // Seed 1 vs P3 (R3)
                    await tx.tournamentMatch.create({
                        data: {
                            tournamentId: tid, phaseId: phase.id, groupId: group.id,
                            player1Id: pIds[0], player2Id: pIds[2],
                            status: 'scheduled', roundNumber: 3
                        }
                    });
                    continue;
                }

                // GSL Format
                if (tournament.groupFormat === 'gsl' && pCount === 4) {
                    // M1: 1 vs 4
                    await tx.tournamentMatch.create({
                        data: {
                            tournamentId: tid, phaseId: phase.id, groupId: group.id,
                            player1Id: pIds[0], player2Id: pIds[3],
                            status: 'scheduled', roundNumber: 1
                        }
                    });
                    // M2: 2 vs 3
                    await tx.tournamentMatch.create({
                        data: {
                            tournamentId: tid, phaseId: phase.id, groupId: group.id,
                            player1Id: pIds[1], player2Id: pIds[2],
                            status: 'scheduled', roundNumber: 1
                        }
                    });
                    // Match 3, 4, 5: Winners, Losers, Decider (Placeholders)
                    await tx.tournamentMatch.create({
                        data: {
                            tournamentId: tid, phaseId: phase.id, groupId: group.id,
                            status: 'scheduled', roundNumber: 2
                        }
                    });
                    await tx.tournamentMatch.create({
                        data: {
                            tournamentId: tid, phaseId: phase.id, groupId: group.id,
                            status: 'scheduled', roundNumber: 2
                        }
                    });
                    await tx.tournamentMatch.create({
                        data: {
                            tournamentId: tid, phaseId: phase.id, groupId: group.id,
                            status: 'scheduled', roundNumber: 3
                        }
                    });
                    continue;
                }

                // Standard Round Robin
                let roundNum = 1;
                for (let i = 0; i < pCount; i++) {
                    for (let j = i + 1; j < pCount; j++) {
                        await tx.tournamentMatch.create({
                            data: {
                                tournamentId: tid,
                                phaseId: phase.id,
                                groupId: group.id,
                                player1Id: pIds[i],
                                player2Id: pIds[j],
                                status: 'scheduled',
                                roundNumber: roundNum++
                            }
                        });
                    }
                }
            }
        });

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true };
    } catch (e) {
        console.error('Error generating groups:', e);
        return { success: false, message: e.message };
    }
}

export async function previewGroups(tournamentId) {
    const tid = parseInt(tournamentId);
    const tournament = await prisma.tournament.findUnique({
        where: { id: tid }
    });
    if (!tournament) return [];

    const groupSize = tournament.groupSize || 4;
    const players = await getTournamentPlayers(tournamentId);
    const activePlayers = players.filter(p => p.status === 'active' || !p.status);

    const groupCount = Math.ceil(activePlayers.length / groupSize);

    // Sort by Average (Seeding)
    const seededPlayers = [...activePlayers].sort((a, b) => {
        const avgA = parseFloat(a.average) || 0;
        const avgB = parseFloat(b.average) || 0;
        if (avgA !== avgB) return avgB - avgA;
        return a.id - b.id;
    });

    const tablesAvailable = tournament.tablesAvailable || 4;
    const blockDuration = parseInt(tournament.blockDuration) || 180;
    let startDate = tournament.startDate ? new Date(tournament.startDate) : new Date();
    if (isNaN(startDate.getTime())) startDate = new Date();

    const groups = [];
    for (let i = 0; i < groupCount; i++) {
        const turnIndex = Math.floor(i / tablesAvailable);
        const tableNum = (i % tablesAvailable) + 1;
        const startTime = new Date(startDate.getTime() + (turnIndex * blockDuration * 60000));

        groups.push({
            name: (i + 1).toString(),
            players: [],
            schedule: {
                table: tableNum,
                startTime: isNaN(startTime.getTime()) ? new Date().toISOString() : startTime.toISOString()
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
    try {
        const tid = parseInt(tournamentId);
        const tournament = await prisma.tournament.findUnique({
            where: { id: tid }
        });
        if (!tournament) throw new Error('Torneo no encontrado');

        const targetSize = tournament.playoffTargetSize || 16;
        const qualifiersPerGroup = tournament.qualifiersPerGroup || 2;

        const existingPhases = await prisma.tournamentPhase.findMany({
            where: { tournamentId: tid, type: 'elimination' }
        });

        if (existingPhases.length > 0) {
            const phaseId = existingPhases[0].id;
            const matchesCount = await prisma.tournamentMatch.count({
                where: { phaseId }
            });
            if (matchesCount > 0) {
                throw new Error('Ya existen playoffs generados');
            }
            await prisma.tournamentPhase.delete({ where: { id: phaseId } });
        }

        const matches = await getMatches(tournamentId);
        const groups = {}; 
        const initStats = () => ({ points: 0, innings: 0, score: 0, matches: 0, handicap: 0 });

        matches.filter(m => m.phase_type === 'group' && m.status === 'completed').forEach(m => {
            if (!groups[m.groupId]) groups[m.groupId] = {};
            const g = groups[m.groupId];
            if (!g[m.player1Id]) g[m.player1Id] = initStats();
            if (!g[m.player2Id]) g[m.player2Id] = initStats();
            const p1 = g[m.player1Id];
            const p2 = g[m.player2Id];
            if (!p1.handicap && m.player1_handicap) p1.handicap = m.player1_handicap;
            if (!p2.handicap && m.player2_handicap) p2.handicap = m.player2_handicap;
            p1.matches++; p2.matches++;
            p1.innings += (m.innings || 0); p2.innings += (m.innings || 0);
            p1.score += (m.scoreP1 || 0); p2.score += (m.scoreP2 || 0);
            if (m.winnerId === m.player1Id) p1.points += 2;
            else if (m.winnerId === m.player2Id) p2.points += 2;
            else { p1.points += 1; p2.points += 1; }
        });

        let qualified = [];
        for (const gid in groups) {
            const pStats = groups[gid];
            const sorted = Object.entries(pStats).map(([pid, stats]) => {
                const avg = stats.innings > 0 ? stats.score / stats.innings : 0;
                const handicap = stats.handicap || 20;
                const factor = handicap > 0 ? 28 / handicap : 1;
                const weightedScore = stats.score * factor;
                const wAvg = stats.innings > 0 ? weightedScore / stats.innings : 0;
                return { pid: parseInt(pid), ...stats, avg, wAvg };
            }).sort((a, b) => {
                if (tournament.groupFormat === 'gsl') {
                    if (b.points !== a.points) return b.points - a.points;
                    if (a.matches !== b.matches) return a.matches - b.matches;
                    return b.wAvg - a.wAvg;
                }
                if (b.points !== a.points) return b.points - a.points;
                if (Math.abs(b.wAvg - a.wAvg) > 0.0001) return b.wAvg - a.wAvg;
                return b.avg - a.avg;
            });
            for (let i = 0; i < qualifiersPerGroup; i++) {
                if (sorted[i]) {
                    qualified.push({ ...sorted[i], rankInGroup: i + 1, groupId: parseInt(gid) });
                }
            }
        }

        if (qualified.length < 2) throw new Error(`No hay suficientes clasificados para generar llaves.`);

        const sortFn = (a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (Math.abs(b.wAvg - a.wAvg) > 0.0001) return b.wAvg - a.wAvg;
            return b.avg - a.avg;
        };

        const firsts = qualified.filter(q => q.rankInGroup === 1).sort(sortFn);
        const seconds = qualified.filter(q => q.rankInGroup === 2).sort(sortFn);
        const others = qualified.filter(q => q.rankInGroup > 2).sort(sortFn);
        qualified = [...firsts, ...seconds, ...others];

        const totalQualified = qualified.length;
        const excess = totalQualified - targetSize;

        if (excess > 0) {
            const prelimMatchesCount = excess;
            const prelimPlayersCount = excess * 2;
            const directQualifiersCount = targetSize - excess;

            return await prisma.$transaction(async (tx) => {
                const prelimPhase = await tx.tournamentPhase.create({
                    data: { tournamentId: tid, name: 'Repechaje', type: 'elimination_prelim', sequenceOrder: 2 }
                });
                const mainPhase = await tx.tournamentPhase.create({
                    data: { tournamentId: tid, name: 'Fase Final', type: 'elimination', sequenceOrder: 3 }
                });
                const prelimPlayers = qualified.slice(directQualifiersCount, directQualifiersCount + prelimPlayersCount);
                for (let i = 0; i < prelimMatchesCount; i++) {
                    const p1 = prelimPlayers[i];
                    const p2 = prelimPlayers[prelimPlayers.length - 1 - i];
                    await tx.tournamentMatch.create({
                        data: {
                            tournamentId: tid, phaseId: prelimPhase.id, status: 'scheduled', roundNumber: 1,
                            player1Id: p1.pid, player2Id: p2.pid
                        }
                    });
                }
                revalidatePath(`/admin/tournaments/${tournamentId}`);
                return { success: true, message: 'Repechaje generado' };
            });
        } else {
            let size = 2;
            while (size < totalQualified) size *= 2;
            if (targetSize >= totalQualified) size = targetSize;

            return await prisma.$transaction(async (tx) => {
                const phase = await tx.tournamentPhase.create({
                    data: { tournamentId: tid, name: 'Playoffs', type: 'elimination', sequenceOrder: 2 }
                });
                const getBracketOrder = (s) => {
                    if (s === 2) return [1, 2];
                    if (s === 32) return [1, 16, 9, 8, 5, 12, 13, 4, 3, 14, 11, 6, 7, 10, 15, 2];
                    if (s === 16) return [1, 8, 5, 4, 3, 6, 7, 2];
                    if (s === 8) return [1, 4, 3, 2];
                    return Array.from({ length: s / 2 }, (_, i) => i + 1);
                };
                const orderedTopSeeds = getBracketOrder(size);
                const seed = (n) => qualified[n - 1];
                for (let i = 0; i < orderedTopSeeds.length; i++) {
                    const s = orderedTopSeeds[i];
                    const opponentSeed = size + 1 - s;
                    const p1 = seed(s);
                    const p2 = seed(opponentSeed);
                    await tx.tournamentMatch.create({
                        data: {
                            tournamentId: tid, phaseId: phase.id, status: 'scheduled',
                            player1Id: p1 ? p1.pid : null,
                            player2Id: p2 ? p2.pid : null,
                            player1Handicap: p1 ? p1.handicap : null,
                            player2Handicap: p2 ? p2.handicap : null
                        }
                    });
                }
                revalidatePath(`/admin/tournaments/${tournamentId}`);
                return { success: true };
            });
        }
    } catch (e) {
        console.error('Error in generatePlayoffs:', e);
        return { success: false, message: e.message };
    }
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
        const tid = parseInt(tournamentId);
        const pid = parseInt(playerId);

        return await prisma.$transaction(async (tx) => {
            // 1. Mark player as disqualified
            await tx.tournamentPlayer.update({
                where: { id: pid },
                data: { status: 'disqualified' }
            });

            // 2. Resolve future matches as WO
            const tournament = await tx.tournament.findUnique({
                where: { id: tid }
            });

            const matches = await tx.tournamentMatch.findMany({
                where: {
                    tournamentId: tid,
                    OR: [{ player1Id: pid }, { player2Id: pid }],
                    status: 'scheduled'
                },
                include: { phase: true }
            });

            const groupLimit = tournament.groupPointsLimit || 0;
            const playoffLimit = tournament.playoffPointsLimit || 0;

            for (const match of matches) {
                const winnerId = match.player1Id === pid ? match.player2Id : match.player1Id;
                const targetPoints = match.phase.type === 'group' ? groupLimit : playoffLimit;

                const isWinnerP1 = match.player1Id === winnerId;
                const scoreP1 = isWinnerP1 ? targetPoints : 0;
                const scoreP2 = isWinnerP1 ? 0 : targetPoints;

                await tx.tournamentMatch.update({
                    where: { id: match.id },
                    data: {
                        status: 'completed',
                        winnerId,
                        scoreP1,
                        scoreP2,
                        winReason: 'wo',
                        updatedAt: new Date()
                    }
                });
            }
            revalidatePath(`/admin/tournaments/${tournamentId}`);
            return { success: true, message: 'Jugador descalificado y partidos restantes marcados como W.O.' };
        });
    } catch (e) {
        console.error(e);
        return { success: false, message: 'Error al descalificar jugador: ' + e.message };
    }
}

// --- RESET FUNCTIONALITY ---

export async function purgeTournament(tournamentId) {
    try {
        const tid = parseInt(tournamentId);
        await prisma.$transaction(async (tx) => {
            await tx.tournamentMatch.deleteMany({ where: { tournamentId: tid } });
            const phases = await tx.tournamentPhase.findMany({ where: { tournamentId: tid }, select: { id: true } });
            const phaseIds = phases.map(p => p.id);
            await tx.tournamentGroup.deleteMany({ where: { phaseId: { in: phaseIds } } });
            await tx.tournamentPhase.deleteMany({ where: { tournamentId: tid } });
        });
        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, message: 'Fixture eliminado correctamente' };
    } catch (e) {
        console.error(e);
        return { success: false, message: e.message };
    }
}

// --- REPARACIÓN GSL ---

export async function repairGSL(tournamentId) {
    try {
        const matches = await getMatches(tournamentId);
        const completedGroupMatches = matches.filter(m => m.phase_type === 'group' && m.status === 'completed');

        const groupMap = new Map();
        completedGroupMatches.forEach(m => groupMap.set(m.groupId, m.id));

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
        const tid = parseInt(tournamentId);
        const phase = await prisma.tournamentPhase.findFirst({
            where: { tournamentId: tid, type: 'elimination' },
            orderBy: { sequenceOrder: 'desc' }
        });

        if (!phase) throw new Error('No hay fase de playoffs activa.');

        const matches = await prisma.tournamentMatch.findMany({
            where: { phaseId: phase.id },
            orderBy: { id: 'asc' }
        });

        const maxRound = Math.max(...matches.map(m => m.roundNumber || 0));
        const currentRoundMatches = matches.filter(m => m.roundNumber === maxRound);

        if (currentRoundMatches.length === 0) throw new Error('No hay partidos en la ronda actual.');

        const unfinished = currentRoundMatches.filter(m => m.status !== 'completed');
        if (unfinished.length > 0) {
            throw new Error(`Aún hay ${unfinished.length} partidos pendientes en esta ronda.`);
        }

        if (currentRoundMatches.length === 1) throw new Error('El torneo ya ha finalizado (Final jugada).');

        const winners = currentRoundMatches.map(m => {
            if (!m.winnerId) throw new Error(`El partido ${m.id} no tiene ganador.`);
            return { pid: m.winnerId };
        });

        const nextRound = maxRound + 1;
        const nextMatchesCount = winners.length / 2;

        await prisma.$transaction(async (tx) => {
            for (let i = 0; i < nextMatchesCount; i++) {
                const p1 = winners[i * 2];
                const p2 = winners[i * 2 + 1];
                await tx.tournamentMatch.create({
                    data: {
                        tournamentId: tid,
                        phaseId: phase.id,
                        player1Id: p1.pid,
                        player2Id: p2.pid,
                        status: 'scheduled',
                        roundNumber: nextRound
                    }
                });
            }
        });

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, message: `Ronda ${nextRound} generada con éxito (${nextMatchesCount} partidos).` };
    } catch (e) {
        console.error(e);
        return { success: false, message: e.message };
    }
}


export async function assignTablesRandomly(tournamentId, tableCount) {
    try {
        const tid = parseInt(tournamentId);

        // Get active groups
        const groups = await prisma.tournamentGroup.findMany({
            where: {
                phase: {
                    tournamentId: tid,
                    type: 'group'
                }
            },
            select: { id: true, name: true }
        });

        if (groups.length === 0) throw new Error('No hay grupos para asignar mesas.');

        const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

        // Fisher-Yates Shuffle
        for (let i = tables.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tables[i], tables[j]] = [tables[j], tables[i]];
        }

        // Assign to groups
        await prisma.$transaction(async (tx) => {
            for (let i = 0; i < groups.length; i++) {
                const tableNum = tables[i % tables.length];
                await tx.tournamentGroup.update({
                    where: { id: groups[i].id },
                    data: { tableAssignment: tableNum }
                });

                await tx.tournamentMatch.updateMany({
                    where: {
                        groupId: groups[i].id,
                        status: { in: ['scheduled', 'pending'] }
                    },
                    data: { tableNumber: tableNum }
                });
            }
        });

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, message: `Mesas asignadas aleatoriamente a ${groups.length} grupos.` };

    } catch (e) {
        console.error(e);
        return { success: false, message: e.message };
    }
}

export async function updateMatchTable(matchId, tableNumber) {
    try {
        const mid = parseInt(matchId);
        const match = await prisma.tournamentMatch.update({
            where: { id: mid },
            data: { tableNumber: parseInt(tableNumber) }
        });

        if (match.tournamentId) {
            revalidatePath(`/admin/tournaments/${match.tournamentId}`);
        }
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

export async function swapPlayers(player1Id, player2Id, tournamentId) {
    try {
        const tid = parseInt(tournamentId);
        const p1id = parseInt(player1Id);
        const p2id = parseInt(player2Id);

        console.log(`Swapping players: ${p1id} <-> ${p2id} in tournament ${tid}`);
        
        await prisma.$transaction(async (tx) => {
            const matches = await tx.tournamentMatch.findMany({
                where: {
                    tournamentId: tid,
                    OR: [
                        { player1Id: p1id },
                        { player1Id: p2id },
                        { player2Id: p1id },
                        { player2Id: p2id }
                    ]
                }
            });

            for (const match of matches) {
                let newP1 = match.player1Id;
                let newP2 = match.player2Id;

                if (match.player1Id === p1id) newP1 = p2id;
                else if (match.player1Id === p2id) newP1 = p1id;

                if (match.player2Id === p1id) newP2 = p2id;
                else if (match.player2Id === p2id) newP2 = p1id;

                await tx.tournamentMatch.update({
                    where: { id: match.id },
                    data: { player1Id: newP1, player2Id: newP2 }
                });
            }
        });

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, message: 'Jugadores intercambiados con éxito.' };

    } catch (e) {
        console.error(e);
        return { success: false, message: 'Error al intercambiar: ' + e.message };
    }
}

export async function recalculateAllHandicaps(tournamentId) {
    try {
        const tid = parseInt(tournamentId);
        console.log(`Recalculating handicaps for tournament ${tid}`);
        
        const players = await prisma.tournamentPlayer.findMany({
            where: { tournamentId: tid }
        });

        let updatedCount = 0;
        await prisma.$transaction(async (tx) => {
            for (const p of players) {
                const newHandicap = calculateFechillarHandicap(parseFloat(p.average || 0));
                if (newHandicap !== p.handicap) {
                    await tx.tournamentPlayer.update({
                        where: { id: p.id },
                        data: { handicap: newHandicap }
                    });
                    updatedCount++;
                }
            }
        });

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true, message: `Se recalcularon ${updatedCount} handicaps.` };
    } catch (e) {
        console.error(e);
        return { success: false, message: e.message };
    }
}
