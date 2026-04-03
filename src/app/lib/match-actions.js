import prisma from '@/app/lib/prisma';
import { getSession } from '@/app/lib/session';
import { revalidatePath } from 'next/cache';
import { checkGSLAdvancement } from './gsl-logic';

export async function updateMatchResult(matchId, formData) {
    const session = await getSession();
    if (!session || !['admin', 'delegate', 'superadmin'].includes(session.role)) {
        return { success: false, message: 'No autorizado. Debe ser Admin, Superadmin o Delegado.' };
    }

    const mid = parseInt(matchId);
    const scoreP1 = parseInt(formData.get('scoreP1'));
    const scoreP2 = parseInt(formData.get('scoreP2'));
    const innings = parseInt(formData.get('innings'));
    const highRunP1 = parseInt(formData.get('highRunP1') || '0');
    const highRunP2 = parseInt(formData.get('highRunP2') || '0');
    const tableNumber = parseInt(formData.get('tableNumber')) || null;

    if (isNaN(scoreP1) || isNaN(scoreP2) || isNaN(innings)) {
        return { success: false, message: 'Los puntajes y entradas deben ser numéricos.' };
    }

    try {
        const match = await prisma.tournamentMatch.findUnique({
            where: { id: mid },
            include: {
                player1: { select: { handicap: true } },
                player2: { select: { handicap: true } },
                tournament: { select: { useHandicap: true } },
                phase: { select: { type: true } }
            }
        });

        if (!match) {
            return { success: false, message: 'Partido no encontrado (ID inválido).' };
        }

        const startPlayerId = parseInt(formData.get('startPlayerId')) || null;
        const manualWinnerId = formData.get('manualWinnerId');

        let winnerId = null;
        if (manualWinnerId) {
            winnerId = parseInt(manualWinnerId);
        } else {
            if (scoreP1 > scoreP2) {
                winnerId = match.player1Id;
            } else if (scoreP2 > scoreP1) {
                winnerId = match.player2Id;
            } else if (scoreP1 === scoreP2 && scoreP1 > 0 && match.tournament.useHandicap && match.phase.type === 'group') {
                const h1 = match.player1?.handicap || 28;
                const h2 = match.player2?.handicap || 28;
                if (h1 < h2) winnerId = match.player1Id;
                else if (h2 < h1) winnerId = match.player2Id;
            }
        }

        await prisma.tournamentMatch.update({
            where: { id: mid },
            data: {
                scoreP1,
                scoreP2,
                highRunP1,
                highRunP2,
                innings,
                winnerId,
                tableNumber,
                status: 'completed',
                startPlayerId,
                updatedAt: new Date()
            }
        });

        revalidatePath(`/tournaments/${match.tournamentId}`);
        revalidatePath(`/admin/tournaments/${match.tournamentId}`);
        revalidatePath(`/admin/tournaments/${match.tournamentId}/manage`);

        await checkGSLAdvancement(mid);

        return { success: true };
    } catch (e) {
        console.error("Error updating match:", e);
        return { success: false, message: `Error interno: ${e.message}` };
    }
}

export async function recalculateTournamentWinners(tournamentId) {
    const session = await getSession();
    if (!session || !['admin', 'superadmin'].includes(session.role)) {
        throw new Error('No autorizado');
    }

    const tid = parseInt(tournamentId);

    try {
        const matches = await prisma.tournamentMatch.findMany({
            where: { tournamentId: tid, status: 'completed' },
            include: {
                player1: { select: { handicap: true } },
                player2: { select: { handicap: true } },
                tournament: { select: { useHandicap: true } },
                phase: { select: { type: true } }
            }
        });

        let updatedCount = 0;
        for (const m of matches) {
            let newWinnerId = null;

            if (m.scoreP1 === m.scoreP2 && m.scoreP1 > 0 && m.tournament.useHandicap && m.phase.type === 'group') {
                const h1 = m.player1?.handicap || 28;
                const h2 = m.player2?.handicap || 28;
                if (h1 < h2) newWinnerId = m.player1Id;
                else if (h2 < h1) newWinnerId = m.player2Id;
            } else if (m.scoreP1 !== m.scoreP2) {
                newWinnerId = m.scoreP1 > m.scoreP2 ? m.player1Id : m.player2Id;
            } else {
                newWinnerId = null; // Still a tie
            }

            if (newWinnerId !== m.winnerId) {
                await prisma.tournamentMatch.update({
                    where: { id: m.id },
                    data: { winnerId: newWinnerId }
                });
                updatedCount++;
            }
        }

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        revalidatePath(`/tournaments/${tournamentId}`);

        return { success: true, count: updatedCount, message: `Recalculados ${updatedCount} ganadores.` };
    } catch (e) {
        console.error("Recalculate error:", e);
        return { success: false, message: e.message };
    }
}
