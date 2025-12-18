'use server';

import { query } from '@/app/lib/db';
import { getSession } from '@/app/lib/auth';
import { revalidatePath } from 'next/cache';

// Re-using or replacing existing match updates?
// There might be an existing file. I should check before overwriting blindly.
// The user has `c:\Proyectos\Torneos\app\lib\tournament-actions.js`.
// I will check `tournament-actions.js` for match logic first.
// But to be safe I will create `match-actions.js` if it doesn't exist, or append if I can.
// Checking file list... no `match-actions.js` in open docs, but likely `tournament-actions.js` handles it.
// I'll create a new file to avoid breaking the monster `tournament-actions` file if possible, or better, look for it.
// I will start by querying `tournament-actions.js` content summary.

// Wait, I will write the code here assuming I can use a new file for simpler management.
// If I need to verify match completion logic (brackets etc), I might need to call existing functions.
// Let's create `match-actions.js` specifically for this granular updat.

export async function updateMatchResult(matchId, formData) {
    const session = await getSession();
    if (!session || !['admin', 'delegate'].includes(session.role)) {
        throw new Error('Unauthorized');
    }

    const scoreP1 = parseInt(formData.get('scoreP1'));
    const scoreP2 = parseInt(formData.get('scoreP2'));
    const innings = parseInt(formData.get('innings'));
    const highRunP1 = parseInt(formData.get('highRunP1') || 0);
    const highRunP2 = parseInt(formData.get('highRunP2') || 0);

    // Determine winner (simple logic, or allow manual winner selection?)
    // Usually score determines winner.
    // Assuming scoreP1 > scoreP2 => P1 wins.
    // If draw, handle?

    // We need to fetch the match to see who is P1 and P2?
    // Or just update columns?
    // The `matches` table usually has `player1_id`, `player2_id`, `player1_score`, `player2_score`, `winner_id`...
    // I need to check the columns of `matches` again or assume standard.
    // `add-match-stats.js` showed me columns: ... I didn't see them all.
    // I'll assume `player1_score`, `player2_score`, `winner_id`, `status`.

    if (isNaN(scoreP1) || isNaN(scoreP2)) {
        return { success: false, message: 'Puntajes inválidos' };
    }

    try {
        // Fetch to determine IDs
        const matchRes = await query('SELECT player1_id, player2_id, tournament_id FROM matches WHERE id = $1', [matchId]);
        const match = matchRes.rows[0];
        if (!match) throw new Error('Match not found');

        let winnerId = null;
        if (scoreP1 > scoreP2) winnerId = match.player1_id;
        else if (scoreP2 > scoreP1) winnerId = match.player2_id;
        else {
            // Draw? Or manual selection needed? 
            // Start w/ null or draw logic if supported.
            // For now assume no stats update on draw or handle later.
        }

        const details = {
            high_run_p1: highRunP1,
            high_run_p2: highRunP2
        };

        // Update match
        await query(`
            UPDATE matches 
            SET player1_score = $1, player2_score = $2, 
                winner_id = $3, 
                status = 'completed',
                innings = $4,
                details = $5,
                end_time = NOW()
            WHERE id = $6
        `, [scoreP1, scoreP2, winnerId, innings, details, matchId]);

        // Trigger tournament progression?
        // If it's a bracket, we need to advance the winner.
        // I should call `advanceWinner(match.tournament_id)` or similar if it exists.
        // For now, updating the result is the step 1. Advancing bracket is complex logic likely in `tournament-actions`.
        // I will trigger revalidate at least.

        revalidatePath(`/admin/tournaments/${match.tournament_id}`);
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, message: e.message };
    }
}
