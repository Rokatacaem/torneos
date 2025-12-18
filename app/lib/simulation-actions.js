'use server';

import { query } from './db';
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

import { generateGroups, updateMatchResult, getMatches } from './tournament-actions';

export async function simulateTournamentData() {
    // 2. Crear Torneo
    const start = new Date(); // Hoy
    const end = new Date();
    end.setDate(end.getDate() + 3); // 3 dias

    // Formatear fechas para insertar
    const tRes = await query(`
        INSERT INTO tournaments (name, start_date, end_date, max_players, format, group_size, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING id
    `, ['Grand Slam Ranking 2025', start, end, 32, 'groups', 4]);

    const tournamentId = tRes.rows[0].id;

    // 3. Crear 32 Jugadores con Ranking
    const players = [];
    for (let i = 0; i < 32; i++) {
        // Generar ranking distribuido (el i=0 tendrá el mejor ranking)
        const ranking = 2000 - (i * 25) + Math.floor(Math.random() * 20);

        const pRes = await query(`
            INSERT INTO tournament_players (tournament_id, player_name, team_name, handicap, ranking)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, player_name
        `, [tournamentId, getRandomName(), `Club ${String.fromCharCode(65 + (i % 8))}`, Math.floor(Math.random() * 5), ranking]);

        players.push(pRes.rows[0]);
    }

    // 4. Generar Grupos usando la nueva lógica (Snake Seeding)
    await generateGroups(tournamentId);

    // 5. Simular Resultados de algunos partidos
    // Obtenemos los partidos recién generados
    const matches = await getMatches(tournamentId);

    // Simulamos el 50% de los partidos
    for (let i = 0; i < matches.length / 2; i++) {
        const m = matches[i];

        // Lógica simple: Mejor ranking (o player1 si no tenemos info aqui) tiene probabilidad de ganar
        // Pero para variar, 70% chance gana el player1 (asumido seed mas alto en snake localmente)
        const p1Wins = Math.random() > 0.3;
        const s1 = p1Wins ? 15 : Math.floor(Math.random() * 10);
        const s2 = p1Wins ? Math.floor(Math.random() * 10) : 15;

        await updateMatchResult(m.id, {
            score_p1: s1,
            score_p2: s2,
            innings: 10 + Math.floor(Math.random() * 10),
            high_run_p1: 0,
            high_run_p2: 0,
            winner_id: p1Wins ? m.player1_id : m.player2_id
        });
    }

    revalidatePath('/admin');
    revalidatePath('/tournaments');
}
