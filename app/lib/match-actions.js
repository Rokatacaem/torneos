'use server';

import { query } from '@/app/lib/db';
import { getSession } from '@/app/lib/session';
import { revalidatePath } from 'next/cache';
import { checkGSLAdvancement } from './gsl-logic';

export async function updateMatchResult(matchId, formData) {
    const session = await getSession();
    if (!session || !['admin', 'delegate', 'superadmin'].includes(session.role)) {
        return { success: false, message: 'No autorizado. Debe ser Admin, Superadmin o Delegado.' };
    }

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
        // Fetch to determine IDs and Player Handicaps
        const matchRes = await query(`
            SELECT m.*, 
                   p1.handicap as hcp1, 
                   p2.handicap as hcp2,
                   t.use_handicap
            FROM tournament_matches m
            JOIN tournament_players p1 ON m.player1_id = p1.id
            JOIN tournament_players p2 ON m.player2_id = p2.id
            JOIN tournaments t ON m.tournament_id = t.id
            WHERE m.id = $1
        `, [matchId]);

        if (matchRes.rows.length === 0) {
            return { success: false, message: 'Partido no encontrado (ID inválido).' };
        }

        const match = matchRes.rows[0];
        const tournamentId = match.tournament_id;

        const startPlayerId = parseInt(formData.get('startPlayerId')) || null;
        const manualWinnerId = formData.get('manualWinnerId');

        let winnerId = null;
        if (manualWinnerId) {
            winnerId = parseInt(manualWinnerId);
        } else {
            if (scoreP1 > scoreP2) {
                winnerId = match.player1_id;
            } else if (scoreP2 > scoreP1) {
                winnerId = match.player2_id;
            } else if (scoreP1 === scoreP2 && scoreP1 > 0 && match.use_handicap) {
                // TIED SCORE + HANDICAP TOURNAMENT -> Determine by Weighted Performance (Score / HCP)
                // Higher percentage wins. Since scores are equal, lower handicap (meta) wins.
                // Example: 20-20. P1(28) vs P2(20). P2 is 100%, P1 is 71%. P2 wins.
                const h1 = match.hcp1 || 28;
                const h2 = match.hcp2 || 28;
                
                if (h1 < h2) {
                    winnerId = match.player1_id; // P1 better percentage
                } else if (h2 < h1) {
                    winnerId = match.player2_id; // P2 better percentage
                }
                // If HCPs are also equal, it remains a tie (null).
            }
        }
        // Empate = null if manualWinnerId is not set AND not resolved by handicap

        // Update match in TOURNAMENT_MATCHES table
        await query(`
            UPDATE tournament_matches
            SET 
                score_p1 = $1, 
                score_p2 = $2, 
                high_run_p1 = $3,
                high_run_p2 = $4,
                innings = $5,
                winner_id = $6, 
                table_number = $8,
                status = 'completed',
                start_player_id = $9,
                updated_at = NOW()
            WHERE id = $7
        `, [scoreP1, scoreP2, highRunP1, highRunP2, innings, winnerId, matchId, tableNumber, startPlayerId]);

        // Revalidate Admin and Public views
        revalidatePath(`/tournaments/${tournamentId}`);
        revalidatePath(`/admin/tournaments/${tournamentId}`);
        revalidatePath(`/admin/tournaments/${tournamentId}/manage`); // Where the modal likely is

        // TRIGGER GSL ADVANCEMENT
        await checkGSLAdvancement(matchId);

        return { success: true };
    } catch (e) {
        console.error("Error updating match:", e);
        // User-friendly error mapping
        if (e.message.includes('column "high_run_p1" does not exist')) {
            return { success: false, message: 'Error de Schema: Columnas de Serie Mayor faltantes en DB.' };
        }
        return { success: false, message: `Error interno: ${e.message}` };
    }
}

export async function recalculateTournamentWinners(tournamentId) {
    const session = await getSession();
    if (!session || !['admin', 'superadmin'].includes(session.role)) {
        throw new Error('No autorizado');
    }

    try {
        // 1. Fetch Tournament Config and Completed Matches with HCPs
        const res = await query(`
            SELECT m.*, 
                   p1.handicap as hcp1, 
                   p2.handicap as hcp2,
                   t.use_handicap
            FROM tournament_matches m
            JOIN tournament_players p1 ON m.player1_id = p1.id
            JOIN tournament_players p2 ON m.player2_id = p2.id
            JOIN tournaments t ON m.tournament_id = t.id
            WHERE m.tournament_id = $1 AND m.status = 'completed'
        `, [tournamentId]);

        let updatedCount = 0;
        for (const m of res.rows) {
            // Recalculate winner IF it's a draw and use_handicap is active
            if (m.score_p1 === m.score_p2 && m.score_p1 > 0 && m.use_handicap) {
                const h1 = m.hcp1 || 28;
                const h2 = m.hcp2 || 28;
                let newWinnerId = null;

                if (h1 < h2) newWinnerId = m.player1_id;
                else if (h2 < h1) newWinnerId = m.player2_id;

                if (newWinnerId !== m.winner_id) {
                    await query(`UPDATE tournament_matches SET winner_id = $1 WHERE id = $2`, [newWinnerId, m.id]);
                    updatedCount++;
                }
            } else if (m.score_p1 !== m.score_p2) {
                // Auto-fix normal wins if they were somehow wrong
                const newWinnerId = m.score_p1 > m.score_p2 ? m.player1_id : m.player2_id;
                if (newWinnerId !== m.winner_id) {
                    await query(`UPDATE tournament_matches SET winner_id = $1 WHERE id = $2`, [newWinnerId, m.id]);
                    updatedCount++;
                }
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
