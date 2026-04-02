import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { query } from '@/app/lib/db';
import { calculateFechillarHandicap } from '@/app/lib/utils';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
    const { id: tournamentId } = await params;

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No se ha subido ningún archivo' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Use raw arrays to detect structure
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length === 0) {
            return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 });
        }

        // Detect Format: 
        // 1. Table Mode (Headers in first/second row)
        // 2. Block Mode (Contains word "GRUPO" in some column)
        const isBlockMode = rows.some(r => r.some(c => typeof c === 'string' && c.toUpperCase().includes('GRUPO ')));

        const stats = {
            total: 0,
            registered: 0,
            matchesCreated: 0,
            errors: []
        };

        if (isBlockMode) {
            await processBlockMode(rows, tournamentId, stats);
        } else {
            // Standard Table Mode (Converted to JSON objects)
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            await processTableMode(jsonData, tournamentId, stats);
        }

        revalidatePath(`/admin/tournaments/${tournamentId}`);
        revalidatePath(`/tournaments/${tournamentId}`);

        return NextResponse.json({
            message: isBlockMode ? 'Importación de Bloques (Fechillar) completada' : 'Importación de Tabla completada',
            stats
        });

    } catch (error) {
        console.error('Import API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function processBlockMode(rows, tournamentId, stats) {
    // 1. Identify Groups and Players
    // A group block looks like:
    // Row N: [";GRUPO 1", "Hora:", ...]
    // Row N+1: ["Jugador", "Hand", "Pon.", "Part.1", "Part.2", ...]
    // Row N+2: ["Player A", 22, 1.27, 12, 18, ...]
    // Row N+3: ["Player B", 22, 1.27, 15, 5, ...]
    // Row N+4: ["Player C", 20, 1.40, 13, 15, ...]

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const firstCell = String(row[0] || row[1] || "").toUpperCase();

        if (firstCell.includes('GRUPO ')) {
            const groupName = firstCell.replace(';', '').trim();
            // Header is next row (i+1), Players are i+2, i+3, i+4
            const pRows = [rows[i+2], rows[i+3], rows[i+4]];
            
            // Resolve Phase (Default to 1st group phase)
            const phaseRes = await query('SELECT id FROM tournament_phases WHERE tournament_id = $1 AND type = \'group\' LIMIT 1', [tournamentId]);
            let phaseId = phaseRes.rows.length > 0 ? phaseRes.rows[0].id : null;
            
            // Create Phase if not exists
            if (!phaseId) {
                const newPhase = await query('INSERT INTO tournament_phases (tournament_id, name, type, order_index) VALUES ($1, \'Fase de Grupos\', \'group\', 1) RETURNING id', [tournamentId]);
                phaseId = newPhase.rows[0].id;
            }

            // Create Group
            const groupRes = await query('INSERT INTO tournament_groups (tournament_id, phase_id, name) VALUES ($1, $2, $3) RETURNING id', [tournamentId, phaseId, groupName]);
            const groupId = groupRes.rows[0].id;

            const groupPlayers = [];

            // Process 3 players
            for (const pRow of pRows) {
                if (!pRow || !pRow[1]) continue;
                // Col index mapping based on Fechillar typical: 0=Index/Null, 1=Jugador, 2=Hand, 3=Pon, 4=P1, 5=P2, 6=E1, 7=E2
                // Wait, user CSV: Jugador(1);Hand(2);Pon(3);Part1(4);Part2(5);Part1Ent(6);Part2Ent(7)
                const name = String(pRow[1]).trim();
                const hcp = parseInt(pRow[2]) || 28;
                const p1_car = parseInt(pRow[4]) || 0;
                const p2_car = parseInt(pRow[5]) || 0;
                const p1_ent = parseInt(pRow[6]) || 35;
                const p2_ent = parseInt(pRow[7]) || 35;

                // Create Player (Register in Global Player DB + Tournament)
                const playerId = await resolveAndRegisterPlayer(name, hcp, tournamentId);
                groupPlayers.push({ id: playerId, name, hcp, p1_car, p2_car, p1_ent, p2_ent });
                stats.registered++;
            }

            // Reconstruct 3 Matches (A vs B, A vs C, B vs C)
            // Lógica Fechillar deducida:
            // Match 1: Player A vs Player C (A-P1, C-P1)
            // Match 2: Player A vs Player B (A-P2, B-P1)
            // Match 3: Player B vs Player C (B-P2, C-P2)
            if (groupPlayers.length === 3) {
                const [A, B, C] = groupPlayers;
                
                await createHistoricMatch(tournamentId, groupId, phaseId, A, C, A.p1_car, C.p1_car, A.p1_ent);
                await createHistoricMatch(tournamentId, groupId, phaseId, A, B, A.p2_car, B.p1_car, A.p2_ent);
                await createHistoricMatch(tournamentId, groupId, phaseId, B, C, B.p2_car, C.p2_car, B.p2_ent);
                stats.matchesCreated += 3;
            }
            
            i += 4; // Skip the group block
        }
    }
}

async function resolveAndRegisterPlayer(name, handicap, tournamentId) {
    // 1. Resolve Global Player ID
    let pRes = await query('SELECT id FROM players WHERE name ILIKE $1', [name]);
    let playerId = null;

    if (pRes.rows.length === 0) {
        const newP = await query('INSERT INTO players (name, average) VALUES ($1, $2) RETURNING id', [name, 0]);
        playerId = newP.rows[0].id;
    } else {
        playerId = pRes.rows[0].id;
    }

    // 2. Register in Tournament
    const existingTP = await query('SELECT id FROM tournament_players WHERE tournament_id = $1 AND player_id = $2', [tournamentId, playerId]);
    if (existingTP.rows.length === 0) {
        await query(`
            INSERT INTO tournament_players (tournament_id, player_id, player_name, handicap)
            VALUES ($1, $2, $3, $4)
        `, [tournamentId, playerId, name, handicap]);
    }
    return playerId;
}

async function createHistoricMatch(tournamentId, groupId, phaseId, p1, p2, s1, s2, innings) {
    let winnerId = null;
    if (s1 > s2) winnerId = p1.id;
    else if (s2 > s1) winnerId = p2.id;
    else if (s1 === s2 && s1 > 0) {
        // Apply Handicap Tiebreak (Lower Meta wins)
        if (p1.hcp < p2.hcp) winnerId = p1.id;
        else if (p2.hcp < p1.hcp) winnerId = p2.id;
    }

    await query(`
        INSERT INTO tournament_matches 
        (tournament_id, phase_id, group_id, player1_id, player2_id, score_p1, score_p2, innings, winner_id, status, phase_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', 'group')
    `, [tournamentId, phaseId, groupId, p1.id, p2.id, s1, s2, innings, winnerId]);
}

async function processTableMode(jsonData, tournamentId, stats) {
    // Existing logic refactored
    const tourRes = await query('SELECT max_players FROM tournaments WHERE id = $1', [tournamentId]);
    const maxPlayers = tourRes.rows[0]?.max_players || 9999;
    
    for (const row of jsonData) {
        try {
            let name = row['Nombre'] || row['Jugador'];
            if (!name) continue;
            name = name.trim();

            const avg = parseFloat(row['Promedio'] || row['General'] || row['PROM'] || 0);
            const hcp = parseInt(row['Handicap'] || row['Hand'] || row['HAN'] || calculateFechillarHandicap(avg));
            const ranking = parseInt(row['Ranking'] || row['Lugar'] || 0);

            const playerId = await resolveAndRegisterPlayer(name, hcp, tournamentId);
            stats.registered++;
        } catch (e) { stats.errors.push(e.message); }
    }
}
