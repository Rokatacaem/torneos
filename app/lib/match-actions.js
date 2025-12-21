'use server';

import { query } from '@/app/lib/db';
import { getSession } from '@/app/lib/auth';
import { revalidatePath } from 'next/cache';

export async function updateMatchResult(matchId, formData) {
    const session = await getSession();
    if (!session || !['admin', 'delegate'].includes(session.role)) {
        return { success: false, message: 'No autorizado. Debe ser Admin o Delegado.' };
    }

    const scoreP1 = parseInt(formData.get('scoreP1'));
    const scoreP2 = parseInt(formData.get('scoreP2'));
    const innings = parseInt(formData.get('innings'));
    const highRunP1 = parseInt(formData.get('highRunP1') || '0');
    const highRunP2 = parseInt(formData.get('highRunP2') || '0');

    if (isNaN(scoreP1) || isNaN(scoreP2) || isNaN(innings)) {
        return { success: false, message: 'Los puntajes y entradas deben ser numéricos.' };
    }

    try {
        // Fetch to determine IDs
        const matchRes = await query(`
            SELECT id, tournament_id, player1_id, player2_id 
            FROM tournament_matches 
            WHERE id = $1
        `, [matchId]);

        if (matchRes.rows.length === 0) {
            return { success: false, message: 'Partido no encontrado (ID inválido).' };
        }

        const match = matchRes.rows[0];
        const tournamentId = match.tournament_id;

        let winnerId = null;
        if (scoreP1 > scoreP2) winnerId = match.player1_id;
        else if (scoreP2 > scoreP1) winnerId = match.player2_id;
        // Empate = null

        // Update match in TOURNAMENT_MATCHES table
        // Using correct columns: score_p1, score_p2, high_run_p1, high_run_p2
        await query(`
            UPDATE tournament_matches
            SET 
                score_p1 = $1, 
                score_p2 = $2, 
                high_run_p1 = $3,
                high_run_p2 = $4,
                innings = $5,
                winner_id = $6, 
                status = 'completed',
                updated_at = NOW()
            WHERE id = $7
        `, [scoreP1, scoreP2, highRunP1, highRunP2, innings, winnerId, matchId]);

        // Revalidate Admin and Public views
        revalidatePath(`/tournaments/${tournamentId}`);
        revalidatePath(`/admin/tournaments/${tournamentId}`);
        revalidatePath(`/admin/tournaments/${tournamentId}/manage`); // Where the modal likely is

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
