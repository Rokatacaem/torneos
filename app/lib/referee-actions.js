'use server';

import { query } from './db';
import { revalidatePath } from 'next/cache';

// Optimistic updates happen on client, but this ensures DB consistency
export async function updateMatchScore(matchId, p1Delta, p2Delta, inningDelta) {
    // 1. Get current state to ensure atomicity (simple version)
    // For MVP, we just increment current values in DB

    // We update explicitly based on deltas
    // If delta is 0, we don't change that column logic-wise, but SQL is easier if we just ADD

    // Note: To prevent race conditions properly we'd use SET score = score + 1
    // But we also need to return the new valid state.

    // Construct dynamic query parts based on non-zero deltas?
    // Let's do a simple read-modify-write for logic safety or pure SQL update.
    // Pure SQL is better for concurrency.

    await query(`
        UPDATE tournament_matches
        SET 
            score_p1 = GREATEST(0, COALESCE(score_p1, 0) + $2),
            score_p2 = GREATEST(0, COALESCE(score_p2, 0) + $3),
            innings = GREATEST(0, COALESCE(innings, 0) + $4),
            status = 'in_progress', -- Auto set to in_progress
            updated_at = NOW()
        WHERE id = $1
    `, [matchId, p1Delta, p2Delta, inningDelta]);

    // Force refresh of public views and referee views
    revalidatePath(`/referee/${matchId}`);
    revalidatePath(`/referee`);
    revalidatePath(`/tournaments`);
    // Ideally specific tournament ID, but we might not have it here easily without query. 
    // Revalidating generic paths is safer for MVP.

    return { success: true };
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
