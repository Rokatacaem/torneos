'use server';

import prisma from './prisma';
import { revalidatePath } from 'next/cache';

// Nombres para generar jugadores falsos
const NAMES = [
    "Alex", "Beto", "Carlos", "David", "Eduardo", "Felipe", "Gabriel", "Hugo",
    "Ivan", "Juan", "Kevin", "Luis", "Mario", "Nico", "Oscar", "Pablo",
    "Quintin", "Ricardo", "Sergio", "Tomas", "Ulises", "Victor", "Walter", "Xavier",
    "Yago", "Zacarias", "Antonio", "Bernardo", "Cesar", "Diego", "Esteban", "Federico",
    "Gustavo", "Hector", "Ignacio", "Javier", "Karim", "Lorenzo", "Manuel", "Nestor",
    "Oliver", "Patricio", "Quique", "Roberto", "Santiago", "Teo", "Uriel", "Valentin",
    "Wilmer", "Xavi", "Yair", "Zidane", "Andres", "Bruno", "Cristian", "Daniel",
    "Elias", "Fabian", "Gaston", "Hernan", "Ismael", "Jorge", "Kike", "Lucas"
];

const LASTNAMES = [
    "Silva", "Santos", "Garcia", "Rodriguez", "Lopez", "Martinez", "Gonzalez", "Perez",
    "Sanchez", "Romero", "Sosa", "Torres", "Ruiz", "Diaz", "Dominguez", "Benitez",
    "Flores", "Acosta", "Rojas", "Medina", "Paz", "Cabrera", "Rios", "Vargas",
    "Castillo", "Luna", "Mendoza", "Cruz", "Guzman", "Espinoza", "Aguilar", "Ortiz"
];

function getRandomName() {
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const last = LASTNAMES[Math.floor(Math.random() * LASTNAMES.length)];
    return `${name} ${last}`;
}

import { generateGroups, getMatches } from './tournament-actions';

export async function simulateTournamentData() {
    // 1. Crear Torneo
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 3);

    const tournament = await prisma.tournament.create({
        data: {
            name: 'Grand Slam Ranking 2025',
            startDate: start,
            endDate: end,
            maxPlayers: 32,
            format: 'groups',
            groupSize: 4,
            status: 'active'
        }
    });

    const tournamentId = tournament.id;

    // 2. Crear 32 Jugadores con Ranking
    for (let i = 0; i < 32; i++) {
        const ranking = 2000 - (i * 25) + Math.floor(Math.random() * 20);

        await prisma.tournamentPlayer.create({
            data: {
                tournamentId,
                playerName: getRandomName(),
                teamName: `Club ${String.fromCharCode(65 + (i % 8))}`,
                handicap: Math.floor(Math.random() * 5),
                ranking
            }
        });
    }

    // 3. Generar Grupos
    await generateGroups(tournamentId);

    // 4. Simular Resultados de algunos partidos
    const matches = await getMatches(tournamentId);

    for (let i = 0; i < matches.length / 2; i++) {
        const m = matches[i];
        const p1Wins = Math.random() > 0.3;
        const s1 = p1Wins ? 15 : Math.floor(Math.random() * 10);
        const s2 = p1Wins ? Math.floor(Math.random() * 10) : 15;

        await prisma.tournamentMatch.update({
            where: { id: m.id },
            data: {
                scoreP1: s1,
                scoreP2: s2,
                innings: 10 + Math.floor(Math.random() * 10),
                winnerId: p1Wins ? m.player1Id : m.player2Id,
                status: 'completed'
            }
        });
    }

    revalidatePath('/admin');
    revalidatePath('/tournaments');
}
