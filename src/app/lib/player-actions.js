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
