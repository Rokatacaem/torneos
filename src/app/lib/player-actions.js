'use server';

import prisma from './prisma';
import { getSession } from './session';
import { saveFile } from './upload-utils';
import { revalidatePath } from 'next/cache';

export async function updatePlayerProfile(formData) {
    const session = await getSession();
    if (!session || session.role !== 'player') {
        throw new Error('Unauthorized');
    }

    const userId = session.userId;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { playerId: true }
    });

    const playerId = user?.playerId;
    if (!playerId) {
        throw new Error('No player profile linked');
    }

    const clubId = formData.get('club_id');
    const photoFile = formData.get('photo');

    let photoUrl = null;
    if (photoFile && photoFile.size > 0) {
        photoUrl = await saveFile(photoFile, 'players');
    }

    const updateData = { updatedAt: new Date() };
    if (clubId) updateData.clubId = parseInt(clubId);
    if (photoUrl) updateData.photoUrl = photoUrl;

    await prisma.player.update({
        where: { id: playerId },
        data: updateData
    });

    revalidatePath('/mi-perfil');
    return { success: true };
}

export async function searchGlobalPlayers(term) {
    if (!term || term.length < 1) return [];

    try {
        const players = await prisma.player.findMany({
            where: {
                OR: [
                    { name: { contains: term, mode: 'insensitive' } },
                    { club: { name: { contains: term, mode: 'insensitive' } } }
                ]
            },
            include: {
                club: { select: { name: true } }
            },
            orderBy: { name: 'asc' },
            take: 50
        });

        return players.map(p => ({
            id: p.id,
            name: p.name,
            club_id: p.clubId,
            average: p.average,
            photo_url: p.photoUrl,
            club_name: p.club?.name || 'Inscripción Abierta'
        }));
    } catch (e) {
        console.error("Search Error details:", e);
        return [];
    }
}

export async function getPlayerFullHistory(playerId) {
    if (!playerId) return null;
    const pid = parseInt(playerId);

    try {
        // 1. Get Tournament History
        const tournamentPlayers = await prisma.tournamentPlayer.findMany({
            where: { playerId: pid },
            include: {
                tournament: {
                    select: {
                        id: true,
                        name: true,
                        startDate: true
                    }
                }
            },
            orderBy: {
                tournament: { startDate: 'desc' }
            }
        });

        const tournaments = tournamentPlayers.map(tp => ({
            id: tp.tournament.id,
            name: tp.tournament.name,
            start_date: tp.tournament.startDate,
            initial_ranking: tp.ranking,
            final_position: tp.finalPosition,
            average: tp.average,
            status: tp.status
        }));

        // 2. Get Match History
        const tpIds = tournamentPlayers.map(tp => tp.id);

        const matchesRaw = await prisma.tournamentMatch.findMany({
            where: {
                OR: [
                    { player1Id: { in: tpIds } },
                    { player2Id: { in: tpIds } }
                ],
                status: 'completed'
            },
            include: {
                tournament: { select: { name: true, startDate: true } },
                player1: { select: { playerName: true } },
                player2: { select: { playerName: true } }
            },
            orderBy: [
                { tournament: { startDate: 'desc' } },
                { id: 'desc' }
            ]
        });

        const matches = matchesRaw.map(m => ({
            id: m.id,
            tournament_id: m.tournamentId,
            tournament_name: m.tournament.name,
            start_date: m.tournament.startDate,
            round_label: m.roundLabel,
            instance_stage: m.instanceStage,
            player1_id: m.player1Id,
            player1_name: m.player1?.playerName,
            score_p1: m.scoreP1,
            player2_id: m.player2Id,
            player2_name: m.player2?.playerName,
            score_p2: m.scoreP2,
            innings: m.innings,
            winner_id: m.winnerId,
            status: m.status
        }));

        return { tournaments, matches };

    } catch (e) {
        console.error('Error fetching player history:', e);
        return null;
    }
}
