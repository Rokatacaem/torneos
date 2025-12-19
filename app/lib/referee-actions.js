'use server';

import { query } from './db';
import { revalidatePath } from 'next/cache';

// Optimistic updates happen on client, but this ensures DB consistency
export async function updateMatchScore(matchId, p1Delta, p2Delta, inningDelta, currentPlayerId = null) {
    // 1. Logic to build dynamic update
    // We want to update score AND potentially current_player_id if provided (turn change)

    let queryStr = `
        UPDATE tournament_matches
        SET 
            score_p1 = GREATEST(0, COALESCE(score_p1, 0) + $2),
            score_p2 = GREATEST(0, COALESCE(score_p2, 0) + $3),
            innings = GREATEST(0, COALESCE(innings, 0) + $4),
            status = 'in_progress',
            updated_at = NOW()
    `;

    const params = [matchId, p1Delta, p2Delta, inningDelta];
    let paramIdx = 5;

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
