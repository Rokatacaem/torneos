import prisma from './prisma';

export async function checkGSLAdvancement(matchId) {
    const mid = parseInt(matchId);

    const match = await prisma.tournamentMatch.findUnique({
        where: { id: mid },
        include: {
            tournament: { select: { groupFormat: true } },
            phase: { select: { type: true } }
        }
    });

    if (!match || match.phase.type !== 'group' || match.tournament.groupFormat !== 'gsl') {
        return;
    }

    const { groupId, tournamentId, phaseId } = match;
    if (!groupId) return;

    const matches = await prisma.tournamentMatch.findMany({
        where: { groupId },
        orderBy: { id: 'asc' }
    });

    const getResult = (m) => {
        if (m.status !== 'completed' || !m.winnerId) return null;
        const winner = m.winnerId;
        const loser = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
        return { winner, loser };
    };

    // CASE A: Legacy/Partial (matches missing)
    if (matches.length < 5) {
        if (matches.length === 2 && matches[0].status === 'completed' && matches[1].status === 'completed') {
            const r1 = getResult(matches[0]);
            const r2 = getResult(matches[1]);

            await prisma.tournamentMatch.create({
                data: {
                    tournamentId, phaseId, groupId,
                    player1Id: r1.winner, player2Id: r2.winner,
                    status: 'scheduled', roundNumber: 2
                }
            });

            await prisma.tournamentMatch.create({
                data: {
                    tournamentId, phaseId, groupId,
                    player1Id: r1.loser, player2Id: r2.loser,
                    status: 'scheduled', roundNumber: 2
                }
            });
            return;
        }

        if (matches.length === 4 && matches[2].status === 'completed' && matches[3].status === 'completed') {
            const m3 = matches[2];
            const m4 = matches[3];

            const loserM3 = m3.winnerId === m3.player1Id ? m3.player2Id : m3.player1Id;
            const winnerM4 = m4.winnerId;

            await prisma.tournamentMatch.create({
                data: {
                    tournamentId, phaseId, groupId,
                    player1Id: loserM3, player2Id: winnerM4,
                    status: 'scheduled', roundNumber: 3
                }
            });
            return;
        }
    }

    // CASE B: Pre-filled (5 matches exist, likely placeholders)
    if (matches.length === 5) {
        const [m1, m2, m3, m4, m5] = matches;

        if (m1.status === 'completed' && m2.status === 'completed') {
            if (!m3.player1Id || !m3.player2Id) {
                const r1 = getResult(m1);
                const r2 = getResult(m2);
                await prisma.tournamentMatch.update({
                    where: { id: m3.id },
                    data: { player1Id: r1.winner, player2Id: r2.winner }
                });
            }

            if (!m4.player1Id || !m4.player2Id) {
                const r1 = getResult(m1);
                const r2 = getResult(m2);
                await prisma.tournamentMatch.update({
                    where: { id: m4.id },
                    data: { player1Id: r1.loser, player2Id: r2.loser }
                });
            }
        }

        if (m3.status === 'completed' && m4.status === 'completed') {
            if (!m5.player1Id || !m5.player2Id) {
                const loserM3 = m3.winnerId === m3.player1Id ? m3.player2Id : m3.player1Id;
                const winnerM4 = m4.winnerId;

                await prisma.tournamentMatch.update({
                    where: { id: m5.id },
                    data: { player1Id: loserM3, player2Id: winnerM4 }
                });
            }
        }
    }
}
