'use server';

import prisma from './prisma';
import { revalidatePath } from 'next/cache';
import { getSession, createSession } from './session';

const GROUP_DATA = [
  {
    name: "1",
    players: [
      { name: "Luis Bahamondes", club: "La Calera", handicap: 28, rank: "A 2" },
      { name: "Mario Díaz", club: "Valparaiso", handicap: 22, rank: "A 35" },
      { name: "Juan Carlos Johnson", club: "Valparaiso", handicap: 22, rank: "B62" }
    ]
  },
  {
    name: "2",
    players: [
      { name: "Bladimir Arenas", club: "San Miguel", handicap: 26, rank: "A 5" },
      { name: "Ricardo Alfaro", club: "La Calera", handicap: 22, rank: "A 30" },
      { name: "Jamir Genaro", club: "San Miguel", handicap: 22, rank: "S / R" }
    ]
  },
  {
    name: "3",
    players: [
      { name: "Carlos Guerra", club: "Valparaiso", handicap: 26, rank: "A 7" },
      { name: "Rogelio Orozco", club: "Santiago", handicap: 22, rank: "A 32" },
      { name: "Fernando Ramirez", club: "La Calera", handicap: 20, rank: "B 77" }
    ]
  },
  {
    name: "4",
    players: [
      { name: "Alejandro Riffo", club: "San Miguel", handicap: 26, rank: "C 90" },
      { name: "Jorge Trujillo", club: "Santiago", handicap: 24, rank: "A 21" },
      { name: "Luis Alfaro", club: "La Calera", handicap: 22, rank: "B 72" }
    ]
  },
  {
    name: "5",
    players: [
      { name: "Ulises Salinas", club: "Valparaiso", handicap: 26, rank: "A9" },
      { name: "Camilo Hadad", club: "Santiago", handicap: 24, rank: "A 23" },
      { name: "Francisco Marshal", club: "Santiago", handicap: 22, rank: "A 37" }
    ]
  },
  {
    name: "6",
    players: [
      { name: "Marco Duarte", club: "La Calera", handicap: 26, rank: "A 10" },
      { name: "Adolfo Rojas", club: "San Miguel", handicap: 24, rank: "C 96" },
      { name: "Manuel Gomez", club: "Valparaiso", handicap: 20, rank: "A41" }
    ]
  },
  {
    name: "7",
    players: [
      { name: "Jorge Castillo", club: "Valparaiso", handicap: 26, rank: "A 11" },
      { name: "Eduardo Lopez", club: "Santiago", handicap: 24, rank: "B 55" },
      { name: "Irving Nieves", club: "Propool", handicap: 20, rank: "B 79" }
    ]
  },
  {
    name: "8",
    players: [
      { name: "Silvio Matus", club: "Santiago", handicap: 24, rank: "B 49" },
      { name: "Victor Saavedra", club: "Propool", handicap: 24, rank: "B 54" },
      { name: "Cristian Rioja", club: "Valparaiso", handicap: 20, rank: "A 42" }
    ]
  },
  {
    name: "9",
    players: [
      { name: "Rodrigo Zuñiga", club: "Santiago", handicap: 24, rank: "A 15" },
      { name: "Ariel Bernal", club: "La Calera", handicap: 22, rank: "A 29" },
      { name: "Jorge Decebal", club: "San Miguel", handicap: 20, rank: "B 83" }
    ]
  },
  {
    name: "10",
    players: [
      { name: "Carlos Olaya", club: "San Miguel", handicap: 24, rank: "A 16" },
      { name: "Peter Sarmiento", club: "La Calera", handicap: 24, rank: "A 18" },
      { name: "Felipe Montaña", club: "San Miguel", handicap: 18, rank: "B 87" }
    ]
  },
  {
    name: "11",
    players: [
      { name: "Juan Carlos Toro", club: "La Calera", handicap: 24, rank: "B 52" },
      { name: "Pablo Chicurel", club: "San Miguel", handicap: 24, rank: "A 17" },
      { name: "Pablo Plaza", club: "La Calera", handicap: 20, rank: "B 85" }
    ]
  }
];

export async function setupManualGroups() {
  try {
    console.log('--- START MANUAL GROUPS SETUP ---');

    // 1. Identify Tournament (target "Grand Slam Ranking 2025")
    let tournament = await prisma.tournament.findFirst({
        where: { name: 'Grand Slam Ranking 2025' }
    });

    if (!tournament) {
        tournament = await prisma.tournament.create({
            data: {
                name: 'Grand Slam Ranking 2025',
                startDate: new Date(),
                format: 'groups',
                groupSize: 3,
                status: 'active',
                tenantId: null // We will set this after identifying the host
            }
        });
    }

    const tid = tournament.id;

    // 2. Perform Cleanup (Destroy existing fixtures for this tournament)
    await prisma.$transaction([
        prisma.tournamentMatch.deleteMany({ where: { tournamentId: tid } }),
        prisma.tournamentGroup.deleteMany({ where: { phase: { tournamentId: tid } } }),
        prisma.tournamentPhase.deleteMany({ where: { tournamentId: tid } }),
        prisma.tournamentPlayer.deleteMany({ where: { tournamentId: tid } })
    ]);

    // 3. Prepare Clubs
    const clubsMap = {}; // { name : clubId }
    const clubNames = [...new Set(GROUP_DATA.flatMap(g => g.players.map(p => p.club)))];
    
    for (const cName of clubNames) {
        let club = await prisma.club.findFirst({ where: { name: cName } });
        if (!club) {
            club = await prisma.club.create({
                data: { name: cName, slug: cName.toLowerCase().replace(/ /g, '-') }
            });
        }
        clubsMap[cName] = club.id;
    }

    // 4. Create Phase, Groups and Players
    await prisma.$transaction(async (tx) => {
        // Create Phase
        const phase = await tx.tournamentPhase.create({
            data: {
                tournamentId: tid,
                name: 'Fase de Calificación (Manual)',
                type: 'group',
                sequenceOrder: 1
            }
        });

        for (const gData of GROUP_DATA) {
            // Create Group
            const group = await tx.tournamentGroup.create({
                data: {
                    phaseId: phase.id,
                    name: gData.name,
                    tableAssignment: parseInt(gData.name)
                }
            });

            const tPlayerIds = [];

            // Create 3 Players for the Group
            for (const pData of gData.players) {
                // Ensure Global Player exists
                let globalPlayer = await tx.player.findFirst({ where: { name: pData.name } });
                if (!globalPlayer) {
                    globalPlayer = await tx.player.create({
                        data: { name: pData.name, clubId: clubsMap[pData.club] }
                    });
                }

                // Create Tournament Player
                const tp = await tx.tournamentPlayer.create({
                    data: {
                        tournamentId: tid,
                        playerName: pData.name,
                        teamName: pData.club,
                        handicap: pData.handicap,
                        playerId: globalPlayer.id,
                        status: 'active'
                    }
                });
                tPlayerIds.push(tp.id);
            }

            // Generate 3 Matches (Round Robin for 3 players)
            // M1: P2 vs P3
            await tx.tournamentMatch.create({
                data: {
                    tournamentId: tid, phaseId: phase.id, groupId: group.id,
                    player1Id: tPlayerIds[1], player2Id: tPlayerIds[2],
                    status: 'scheduled', roundNumber: 1
                }
            });
            // M2: P1 vs P2
            await tx.tournamentMatch.create({
                data: {
                    tournamentId: tid, phaseId: phase.id, groupId: group.id,
                    player1Id: tPlayerIds[0], player2Id: tPlayerIds[1],
                    status: 'scheduled', roundNumber: 2
                }
            });
            // M3: P1 vs P3
            await tx.tournamentMatch.create({
                data: {
                    tournamentId: tid, phaseId: phase.id, groupId: group.id,
                    player1Id: tPlayerIds[0], player2Id: tPlayerIds[2],
                    status: 'scheduled', roundNumber: 3
                }
            });
        }
    });

    // --- FIX: USER & TOURNAMENT BINDING ---
    const session = await getSession();
    if (session && session.userId) {
        // Find "Santiago" club from our map (default host for this setup)
        const hostClubId = clubsMap["Santiago"];
        
        if (hostClubId) {
            // Update the user in DB
            await prisma.user.update({
                where: { id: session.userId },
                data: { clubId: hostClubId, tenantId: hostClubId }
            });

            // Update Tournament Host
            await prisma.tournament.update({
                where: { id: tid },
                data: { hostClubId: hostClubId, tenantId: hostClubId }
            });

            // IMPORTANT: REFRESH SESSION COOKIE
            await createSession(session.userId, session.role, hostClubId);
            console.log(`[Setup] User ${session.userId} linked to Club ${hostClubId}. Session refreshed.`);
        }
    }

    console.log('--- MANUAL GROUPS SETUP COMPLETE ---');
    revalidatePath(`/admin/tournaments/${tid}`);
    revalidatePath('/admin');
    return { success: true, tournamentId: tid };

  } catch (e) {
    console.error('ERROR IN MANUAL SETUP:', e);
    return { success: false, error: e.message };
  }
}
