'use server';

import { query } from './db';
import { revalidatePath } from 'next/cache';
import { getSession } from './session';

// --- ASSIGNMENT MANAGEMENT ---

/**
 * Gets all tournaments assigned to a specific referee.
 * If user is admin, returns all active tournaments instead.
 */
export async function getAssignedTournaments(userId, role) {
    if (!userId) return [];

    // Admins see everything
    if (['admin', 'superadmin', 'delegate'].includes(role)) {
        const res = await query(`
            SELECT DISTINCT t.*
            FROM tournaments t
            JOIN tournament_matches m ON t.id = m.tournament_id
            WHERE m.status IN ('scheduled', 'in_progress')
            ORDER BY t.start_date DESC
        `);
        return res.rows;
    }

    // Referees only see assigned tournaments
    const res = await query(`
        SELECT t.*
        FROM tournaments t
        JOIN tournament_assignments ta ON t.id = ta.tournament_id
        WHERE ta.user_id = $1
        ORDER BY t.start_date DESC
    `, [userId]);
    
    return res.rows;
}

/**
 * Assigns a referee user to a tournament.
 */
export async function assignReferee(tournamentId, userId) {
    try {
        await query(`
            INSERT INTO tournament_assignments (tournament_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
        `, [tournamentId, userId]);
        revalidatePath(`/admin/tournaments/${tournamentId}`);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Removes a referee assignment from a tournament.
 */
export async function removeReferee(tournamentId, userId) {
    await query(`
        DELETE FROM tournament_assignments 
        WHERE tournament_id = $1 AND user_id = $2
    `, [tournamentId, userId]);
    revalidatePath(`/admin/tournaments/${tournamentId}`);
    return { success: true };
}

/**
 * Lists all referees assigned to a tournament.
 */
export async function getTournamentAssignments(tournamentId) {
    const res = await query(`
        SELECT u.id, u.username, u.role, ta.assigned_at
        FROM users u
        JOIN tournament_assignments ta ON u.id = ta.user_id
        WHERE ta.tournament_id = $1
    `, [tournamentId]);
    return res.rows;
}

/**
 * Lists all users with the 'referee' role for the assignment UI.
 */
export async function getAvailableReferees() {
    const res = await query(`
        SELECT id, username, role 
        FROM users 
        WHERE role IN ('referee', 'admin', 'delegate', 'player')
        ORDER BY role DESC, username ASC
    `);
    return res.rows;
}

/**
 * Security helper to verify if the current user is authorized to manage a match.
 */
async function checkMatchAuthorization(matchId) {
    const session = await getSession();
    if (!session) throw new Error('No autorizado: Sesión no encontrada');

    // Admins have global access
    if (['admin', 'superadmin', 'delegate'].includes(session.role)) return true;

    // Check if referee is assigned to this match's tournament
    const res = await query(`
        SELECT ta.id 
        FROM tournament_assignments ta
        JOIN tournament_matches m ON ta.tournament_id = m.tournament_id
        WHERE m.id = $1 AND ta.user_id = $2
    `, [matchId, session.userId]);

    if (res.rows.length === 0) {
        throw new Error('No autorizado: No tienes designación para este torneo');
    }

    return true;
}

// --- MATCH CONTROL ---
// Optimistic updates happen on client, but this ensures DB consistency
export async function updateMatchScore(matchId, options = {}) {
    await checkMatchAuthorization(matchId);
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
    await checkMatchAuthorization(matchId);
    await query(`
        UPDATE tournament_matches
        SET start_player_id = $2, current_player_id = $3, status = 'in_progress', updated_at = NOW()
        WHERE id = $1
    `, [matchId, startPlayerId, currentPlayerId]);
    revalidatePath(`/referee/${matchId}`);
}

export async function setRefereeName(matchId, name) {
    await checkMatchAuthorization(matchId);
    await query(`
        UPDATE tournament_matches
        SET referee_name = $2, updated_at = NOW()
        WHERE id = $1
    `, [matchId, name]);
    revalidatePath(`/referee/${matchId}`);
}


export async function finishMatch(matchId, winnerId) {
    await checkMatchAuthorization(matchId);
    await query(`
        UPDATE tournament_matches
        SET status = 'completed', winner_id = $2, updated_at = NOW()
        WHERE id = $1
    `, [matchId, winnerId]);

    // Check for GSL Advancement
    try {
        const { checkGSLAdvancement } = await import('./gsl-logic');
        await checkGSLAdvancement(matchId);
    } catch (e) {
        console.error("Error in GSL Check:", e);
    }

    revalidatePath('/');
    revalidatePath('/tournaments');
    revalidatePath('/referee');
}

export async function finishMatchWO(matchId, winnerId, targetPoints) {
    await checkMatchAuthorization(matchId);
    // Ensure types
    targetPoints = Number(targetPoints) || 0;
    // ...
    // Determine which score to set
    // If winner is p1, set score_p1 = targetPoints, score_p2 = 0
    // We need to know who is who.

    // We can just rely on the UI sending the correct scores? 
    // Or we fetch the match to check which ID is P1.
    // Let's assume the UI sends the "Winning Player ID".

    const matchRes = await query(`SELECT player1_id, player2_id FROM tournament_matches WHERE id = $1`, [matchId]);
    if (matchRes.rows.length === 0) return;
    const match = matchRes.rows[0];

    // For WO, we set score to 0 for both players as per new rule.
    // The points (2) are handled by the winner_id logic in standings.
    let scoreP1 = 0;
    let scoreP2 = 0;

    // if (match.player1_id == winnerId) { scoreP1 = targetPoints; } 
    // else { scoreP2 = targetPoints; } 
    // ^ DISABLED: WO should have 0 carambolas.

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

    // Check for GSL Advancement
    try {
        const { checkGSLAdvancement } = await import('./gsl-logic');
        await checkGSLAdvancement(matchId);
    } catch (e) {
        console.error("Error in GSL Check:", e);
    }

    // Check for Group of 3 WO Rule
    try {
        const groupInfoRes = await query('SELECT group_id FROM tournament_matches WHERE id = $1', [matchId]);
        const groupInfo = groupInfoRes.rows[0];
        if (groupInfo && groupInfo.group_id) {
            await checkGroupOf3WORule(groupInfo.group_id);
        }
    } catch (e) {
        console.error("Error in Group of 3 WO Rule:", e);
    }

    revalidatePath('/');
    revalidatePath('/tournaments');
    revalidatePath('/referee');
}

async function checkGroupOf3WORule(groupId) {
    if (!groupId) return;

    // 1. Check Group Size (Unique Players)
    const playersRes = await query(`
        SELECT DISTINCT player_id FROM (
            SELECT player1_id as player_id FROM tournament_matches WHERE group_id = $1
            UNION
            SELECT player2_id as player_id FROM tournament_matches WHERE group_id = $1
        ) as p
    `, [groupId]);

    const playerCount = playersRes.rows.length;
    if (playerCount !== 3) return;

    // 2. Iterate pairs to find the active pair (0 WOs between them)
    const matchesRes = await query(`
        SELECT * FROM tournament_matches WHERE group_id = $1
    `, [groupId]);
    const matches = matchesRes.rows;
    const players = playersRes.rows.map(r => r.player_id);

    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            const p1 = players[i];
            const p2 = players[j];

            const pairMatches = matches.filter(m =>
                (m.player1_id === p1 && m.player2_id === p2) ||
                (m.player1_id === p2 && m.player2_id === p1)
            );

            const hasWO = pairMatches.some(m => m.win_reason === 'wo');

            if (!hasWO) {
                // This is the "Active" pair (B vs C).
                // They should have 2 matches.
                if (pairMatches.length < 2) {
                    console.log(`[WO Rule] Creating return match for ${p1} vs ${p2}`);
                    const refMatch = pairMatches[0];
                    await query(`
                        INSERT INTO tournament_matches (
                            tournament_id, phase_id, group_id, 
                            player1_id, player2_id, 
                            status, 
                            updated_at
                        ) VALUES (
                            $1, $2, $3, 
                            $4, $5, 
                            'scheduled', 
                            NOW()
                        )
                    `, [
                        refMatch.tournament_id, refMatch.phase_id, refMatch.group_id,
                        p2, p1
                    ]);
                }
            }
        }
    }
}
