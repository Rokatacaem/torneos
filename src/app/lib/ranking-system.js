import prisma from './prisma';

// Point Scale from User
function getPointsForPosition(pos) {
    if (pos === 1) return 60;
    if (pos === 2) return 50;
    if (pos <= 4) return 40;
    if (pos <= 8) return 30;
    if (pos <= 16) return 20;
    if (pos <= 32) return 10;
    return 5;
}

export async function assignTournamentPoints(tournamentId) {
    const tid = parseInt(tournamentId);

    const phases = await prisma.tournamentPhase.findMany({
        where: { tournamentId: tid, type: 'elimination' },
        orderBy: { sequenceOrder: 'desc' }
    });

    const assignedPlayers = new Set();
    const updates = []; // { pid, pos, pts }

    const assign = (pid, pos) => {
        if (!pid || assignedPlayers.has(pid)) return;
        assignedPlayers.add(pid);
        updates.push({ pid, pos, pts: getPointsForPosition(pos) });
    };

    if (phases.length > 0) {
        const finalPhase = phases[0];
        const finalMatches = await prisma.tournamentMatch.findMany({
            where: { phaseId: finalPhase.id, status: 'completed' }
        });

        finalMatches.forEach(m => {
            if (m.winnerId) {
                assign(m.winnerId, 1);
                assign(m.winnerId === m.player1Id ? m.player2Id : m.player1Id, 2);
            }
        });

        for (let i = 1; i < phases.length; i++) {
            const phase = phases[i];
            const matches = await prisma.tournamentMatch.findMany({
                where: { phaseId: phase.id, status: 'completed' }
            });

            const rankBase = Math.pow(2, i) + 1;

            matches.forEach(m => {
                const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
                assign(loserId, rankBase);
            });
        }
    }

    let cutoff = 33;
    if (phases.length > 0) {
        cutoff = Math.pow(2, phases.length) + 1;
    }

    const allPlayers = await prisma.tournamentPlayer.findMany({
        where: { tournamentId: tid },
        select: { id: true }
    });

    allPlayers.forEach(p => {
        assign(p.id, cutoff);
    });

    await prisma.$transaction(
        updates.map(u => prisma.tournamentPlayer.update({
            where: { id: u.pid },
            data: { finalPosition: u.pos, rankingPoints: u.pts }
        }))
    );

    return updates.length;
}

export async function updateGlobalRanking() {
    const now = new Date();
    const nationalCutoff = new Date();
    nationalCutoff.setFullYear(now.getFullYear() - 1);
    const annualCutoff = new Date(now.getFullYear(), 0, 1);

    const scores = await prisma.tournamentPlayer.findMany({
        where: {
            rankingPoints: { gt: 0 },
            tournament: {
                status: 'completed',
                name: { not: { contains: 'prueba', mode: 'insensitive' } }
            }
        },
        include: {
            tournament: {
                select: { startDate: true, name: true }
            }
        }
    });

    const playersData = {}; // { pid: { nationalPoints: [], annualPoints: [] } }

    scores.forEach(row => {
        if (!row.playerId) return;

        if (!playersData[row.playerId]) {
            playersData[row.playerId] = { nationalPoints: [], annualPoints: [] };
        }

        const date = new Date(row.tournament.startDate);

        if (date >= nationalCutoff) {
            playersData[row.playerId].nationalPoints.push(row.rankingPoints);
        }

        if (date >= annualCutoff) {
            playersData[row.playerId].annualPoints.push(row.rankingPoints);
        }
    });

    const results = [];

    for (const [pid, data] of Object.entries(playersData)) {
        data.nationalPoints.sort((a, b) => b - a);

        const nationalPlayed = data.nationalPoints.length;
        let nationalCategory = 'C';
        let nationalScore = 0;

        if (nationalPlayed >= 5) {
            nationalCategory = 'A';
            nationalScore = data.nationalPoints.slice(0, 5).reduce((a, b) => a + b, 0);
        } else if (nationalPlayed >= 3) {
            nationalCategory = 'B';
            nationalScore = data.nationalPoints.reduce((a, b) => a + b, 0);
        } else {
            nationalCategory = 'C';
            nationalScore = data.nationalPoints.reduce((a, b) => a + b, 0);
        }

        const annualPlayed = data.annualPoints.length;
        const annualScore = data.annualPoints.reduce((a, b) => a + b, 0);

        results.push({
            pid: parseInt(pid),
            nationalScore, nationalCategory, nationalPlayed,
            annualScore, annualPlayed
        });
    }

    await prisma.$transaction(
        results.map(u => prisma.player.update({
            where: { id: u.pid },
            data: {
                ranking: u.nationalScore,
                category: u.nationalCategory,
                tournamentsPlayed: u.nationalPlayed,
                rankingAnnual: u.annualScore,
                tournamentsPlayedAnnual: u.annualPlayed
            }
        }))
    );

    return results.length;
}
