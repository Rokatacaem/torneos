'use server';

import { query } from './db';
import { revalidatePath } from 'next/cache';

// Optimistic updates happen on client, but this ensures DB consistency
// Optimistic updates happen on client, but this ensures DB consistency
export async function updateMatchScore(matchId, options = {}) {
    const { p1Delta = 0, p2Delta = 0, inningDelta = 0, currentPlayerId = null, highRunP1 = 0, highRunP2 = 0 } = options;

    // 1. Logic to build dynamic update
    // We want to update score AND potentially current_player_id if provided (turn change)
    console.log('updateMatchScore', { matchId, ...options });

    let queryStr = `
        UPDATE tournament_matches
        SET 
            score_p1 = GREATEST(0, COALESCE(score_p1, 0) + $2),
            score_p2 = GREATEST(0, COALESCE(score_p2, 0) + $3),
            innings = GREATEST(0, COALESCE(innings, 0) + $4),
            high_run_p1 = GREATEST(COALESCE(high_run_p1, 0), $5),
            high_run_p2 = GREATEST(COALESCE(high_run_p2, 0), $6),
            status = 'in_progress',
             updated_at = NOW()
    `;

    const params = [matchId, p1Delta, p2Delta, inningDelta, highRunP1, highRunP2];
    let paramIdx = 7;

    if (currentPlayerId) {
        queryStr += `, current_player_id = $${paramIdx++}`;
        params.push(currentPlayerId);
    }

    queryStr += ` WHERE id = $1`;

    await query(queryStr, params);

    // Force refresh
    revalidatePath(`/referee/${matchId}`);
    revalidatePath(`/referee`);
    revalidatePath(`/tournaments`);

    return { success: true };
}

export async function setMatchStart(matchId, startPlayerId, currentPlayerId) {
    await query(`
        UPDATE tournament_matches
        SET start_player_id = $2, current_player_id = $3, status = 'in_progress', updated_at = NOW()
        WHERE id = $1
    `, [matchId, startPlayerId, currentPlayerId]);
    revalidatePath(`/referee/${matchId}`);
}

export async function setRefereeName(matchId, name) {
    await query(`
        UPDATE tournament_matches
        SET referee_name = $2, updated_at = NOW()
        WHERE id = $1
    `, [matchId, name]);
    revalidatePath(`/referee/${matchId}`);
}

export async function finishMatch(matchId, winnerId) {
    await query(`
        UPDATE tournament_matches
        SET status = 'completed', winner_id = $2, updated_at = NOW()
        WHERE id = $1
    `, [matchId, winnerId]);
    revalidatePath('/');
    revalidatePath('/tournaments');
}

export async function finishMatchWO(matchId, winnerId, targetPoints) {
    // Determine which score to set
    // If winner is p1, set score_p1 = targetPoints, score_p2 = 0
    // We need to know who is who.

    // We can just rely on the UI sending the correct scores? 
    // Or we fetch the match to check which ID is P1.
    // Let's assume the UI sends the "Winning Player ID".

    const matchRes = await query(`SELECT player1_id, player2_id FROM tournament_matches WHERE id = $1`, [matchId]);
    if (matchRes.rows.length === 0) return;
    const match = matchRes.rows[0];

    let scoreP1 = 0;
    let scoreP2 = 0;

    if (match.player1_id === winnerId) {
        scoreP1 = targetPoints;
    } else {
        scoreP2 = targetPoints;
    }

    await query(`
        UPDATE tournament_matches
        SET 
            status = 'completed', 
            winner_id = $2, 
            score_p1 = $3, 
            score_p2 = $4,
            win_reason = 'wo',
            updated_at = NOW()
        WHERE id = $1
    `, [matchId, winnerId, scoreP1, scoreP2]);

    revalidatePath('/');
    revalidatePath('/tournaments');
}
