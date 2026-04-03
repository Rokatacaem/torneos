'use server';

import prisma from './prisma';
import { revalidatePath } from 'next/cache';
import { getSession } from './session';

// --- ASSIGNMENT MANAGEMENT ---

export async function getAssignedTournaments(userId, role) {
    if (!userId) return [];
    const uid = parseInt(userId);

    // Admins see everything active
    if (['admin', 'superadmin', 'delegate'].includes(role)) {
        return await prisma.tournament.findMany({
            where: {
                matches: {
                    some: {
                        status: { in: ['scheduled', 'in_progress'] }
                    }
                }
            },
            orderBy: { startDate: 'desc' },
            distinct: ['id']
        });
    }

    // Referees only see assigned tournaments
    const assignments = await prisma.tournamentAssignment.findMany({
        where: { userId: uid },
        include: { tournament: true },
        orderBy: { tournament: { startDate: 'desc' } }
    });
    
    return assignments.map(a => a.tournament);
}

export async function assignReferee(tournamentId, userId) {
    try {
        await prisma.tournamentAssignment.upsert({
            where: {
                tournamentId_userId: {
                    tournamentId: parseInt(tournamentId),
                    userId: parseInt(userId)
                }
            },
            update: {},
            create: {
                tournamentId: parseInt(tournamentId),
                userId: parseInt(userId)
            }
        });
        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

export async function removeReferee(tournamentId, userId) {
    await prisma.tournamentAssignment.delete({
        where: {
            tournamentId_userId: {
                tournamentId: parseInt(tournamentId),
                userId: parseInt(userId)
            }
        }
    });
    revalidatePath(`/admin/tournaments/${tournamentId}`);
    return { success: true };
}

export async function getTournamentAssignments(tournamentId) {
    const assignments = await prisma.tournamentAssignment.findMany({
        where: { tournamentId: parseInt(tournamentId) },
        include: {
            user: {
                select: { id: true, username: true, role: true }
            }
        }
    });
    return assignments.map(a => ({
        ...a.user,
        assignedAt: a.assignedAt
    }));
}

export async function getAvailableReferees(tournamentId = null) {
    const tid = tournamentId ? parseInt(tournamentId) : null;
    
    const users = await prisma.user.findMany({
        where: {
            role: { in: ['referee', 'admin', 'delegate', 'player'] }
        },
        include: {
            tournamentPlayers: tid ? {
                where: { tournamentId: tid }
            } : false
        },
        orderBy: { username: 'asc' }
    });

    const result = users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        isParticipant: tid ? (u.tournamentPlayers && u.tournamentPlayers.length > 0) : false
    }));

    return result.sort((a, b) => (b.isParticipant ? 1 : 0) - (a.isParticipant ? 1 : 0));
}

async function checkMatchAuthorization(matchId) {
    const session = await getSession();
    if (!session) throw new Error('No autorizado: Sesión no encontrada');

    if (['admin', 'superadmin', 'delegate'].includes(session.role)) return true;

    const assignment = await prisma.tournamentAssignment.findFirst({
        where: {
            userId: session.userId,
            tournament: {
                matches: {
                    some: { id: parseInt(matchId) }
                }
            }
        }
    });

    if (!assignment) {
        throw new Error('No autorizado: No tienes designación para este torneo');
    }

    return true;
}

// --- MATCH CONTROL ---
export async function updateMatchScore(matchId, options = {}) {
    const mid = parseInt(matchId);
    await checkMatchAuthorization(mid);
    
    const { p1Delta = 0, p2Delta = 0, inningDelta = 0, currentPlayerId = null, highRunP1 = 0, highRunP2 = 0 } = options;

    const match = await prisma.tournamentMatch.findUnique({
        where: { id: mid }
    });

    if (!match) throw new Error('Partido no encontrado');

    const updateData = {
        scoreP1: Math.max(0, (match.scoreP1 || 0) + p1Delta),
        scoreP2: Math.max(0, (match.scoreP2 || 0) + p2Delta),
        innings: Math.max(0, (match.innings || 0) + inningDelta),
        highRunP1: Math.max(match.highRunP1 || 0, highRunP1),
        highRunP2: Math.max(match.highRunP2 || 0, highRunP2),
        status: 'in_progress',
        updatedAt: new Date()
    };

    if (currentPlayerId) {
        updateData.currentPlayerId = parseInt(currentPlayerId);
    }

    await prisma.tournamentMatch.update({
        where: { id: mid },
        data: updateData
    });

    revalidatePath(`/referee/${matchId}`);
    revalidatePath(`/referee`);
    revalidatePath(`/tournaments`);

    return { success: true };
}

export async function setMatchStart(matchId, startPlayerId, currentPlayerId) {
    const mid = parseInt(matchId);
    await checkMatchAuthorization(mid);
    await prisma.tournamentMatch.update({
        where: { id: mid },
        data: {
            startPlayerId: parseInt(startPlayerId),
            currentPlayerId: parseInt(currentPlayerId),
            status: 'in_progress',
            updatedAt: new Date()
        }
    });
    revalidatePath(`/referee/${matchId}`);
}

export async function setRefereeName(matchId, name) {
    const mid = parseInt(matchId);
    await checkMatchAuthorization(mid);
    await prisma.tournamentMatch.update({
        where: { id: mid },
        data: {
            refereeName: name,
            updatedAt: new Date()
        }
    });
    revalidatePath(`/referee/${matchId}`);
}

export async function finishMatch(matchId, winnerId) {
    const mid = parseInt(matchId);
    await checkMatchAuthorization(mid);
    await prisma.tournamentMatch.update({
        where: { id: mid },
        data: {
            status: 'completed',
            winnerId: parseInt(winnerId),
            updatedAt: new Date()
        }
    });

    try {
        const { checkGSLAdvancement } = await import('./gsl-logic');
        await checkGSLAdvancement(mid);
    } catch (e) {
        console.error("Error in GSL Check:", e);
    }

    revalidatePath('/');
    revalidatePath('/tournaments');
    revalidatePath('/referee');
}

export async function finishMatchWO(matchId, winnerId, targetPoints) {
    const mid = parseInt(matchId);
    await checkMatchAuthorization(mid);
    
    // For WO, we set score to 0 for both players as per new rule.
    await prisma.tournamentMatch.update({
        where: { id: mid },
        data: {
            status: 'completed',
            winnerId: parseInt(winnerId),
            scoreP1: 0,
            scoreP2: 0,
            winReason: 'wo',
            updatedAt: new Date()
        }
    });

    try {
        const { checkGSLAdvancement } = await import('./gsl-logic');
        await checkGSLAdvancement(mid);
    } catch (e) {
        console.error("Error in GSL Check:", e);
    }

    try {
        const match = await prisma.tournamentMatch.findUnique({ where: { id: mid } });
        if (match && match.groupId) {
            await checkGroupOf3WORule(match.groupId);
        }
    } catch (e) {
        console.error("Error in Group of 3 WO Rule:", e);
    }

    revalidatePath('/');
    revalidatePath('/tournaments');
    revalidatePath('/referee');
}

async function checkGroupOf3WORule(groupId) {
    if (!groupId) return;

    const matches = await prisma.tournamentMatch.findMany({
        where: { groupId: parseInt(groupId) }
    });

    const playersSet = new Set();
    matches.forEach(m => {
        if (m.player1Id) playersSet.add(m.player1Id);
        if (m.player2Id) playersSet.add(m.player2Id);
    });

    if (playersSet.size !== 3) return;

    const players = Array.from(playersSet);

    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            const p1 = players[i];
            const p2 = players[j];

            const pairMatches = matches.filter(m =>
                (m.player1Id === p1 && m.player2Id === p2) ||
                (m.player1Id === p2 && m.player2Id === p1)
            );

            const hasWO = pairMatches.some(m => m.winReason === 'wo');

            if (!hasWO) {
                if (pairMatches.length < 2) {
                    const refMatch = pairMatches[0];
                    await prisma.tournamentMatch.create({
                        data: {
                            tournamentId: refMatch.tournamentId,
                            phaseId: refMatch.phaseId,
                            groupId: refMatch.groupId,
                            player1Id: p2,
                            player2Id: p1,
                            status: 'scheduled',
                            updatedAt: new Date()
                        }
                    });
                }
            }
        }
    }
}

