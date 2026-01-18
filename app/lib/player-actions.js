'use server';

import { getSession } from './session';
import { query } from './db';
import { saveFile } from './upload-utils';
import { revalidatePath } from 'next/cache';

export async function updatePlayerProfile(formData) {
    const session = await getSession();
    if (!session || session.role !== 'player') {
        throw new Error('Unauthorized');
    }

    const userId = session.userId;

    // Get linked player_id
    const userRes = await query('SELECT player_id FROM users WHERE id = $1', [userId]);
    const playerId = userRes.rows[0]?.player_id;

    if (!playerId) {
        throw new Error('No player profile linked');
    }

    const club_id = formData.get('club_id');
    const photoFile = formData.get('photo');

    let photo_url = null;
    if (photoFile && photoFile.size > 0) {
        // Note: intended for cloud storage in production
        photo_url = await saveFile(photoFile, 'players');
    }

    // Dynamic Update
    let queryStr = 'UPDATE players SET updated_at = NOW()'; // dummy start
    const params = [];
    let paramIdx = 1;

    if (club_id) {
        queryStr += `, club_id = $${paramIdx++}`;
        params.push(club_id);
    }

    if (photo_url) {
        queryStr += `, photo_url = $${paramIdx++}`;
        params.push(photo_url);
    }

    queryStr += ` WHERE id = $${paramIdx}`;
    params.push(playerId);

    if (params.length > 1) { // checking if we actually have fields to update + ID
        await query(queryStr, params);
    }

    revalidatePath('/mi-perfil');
    return { success: true };
}

export async function searchGlobalPlayers(term) {
    if (!term) return [];
    // Allow 1 char? Let's keep it safe but maybe 1 logic is fine for short names
    if (term.length < 1) return [];

    console.log(`Searching global players for: "${term}"`);

    try {
        // Simple query first to verify connectivity if needed, 
        // but let's stick to the join.
        // Ensure case insensitivity
        const res = await query(`
            SELECT p.id, p.name, p.club_id, p.average, p.photo_url, c.name as club_name
            FROM players p
            LEFT JOIN clubs c ON p.club_id = c.id
            WHERE p.name ILIKE $1
            ORDER BY p.name ASC
            LIMIT 50
        `, [`%${term}%`]);

        console.log(`Found ${res.rows.length} players matching "${term}"`);
        return res.rows;
    } catch (e) {
        console.error("Search Error details:", e);
        // Fallback: try without join if club table is issue?
        try {
            const resFallback = await query(`
                SELECT id, name, club_id, average, photo_url
                FROM players
                WHERE name ILIKE $1
                ORDER BY name ASC
                LIMIT 50
            `, [`%${term}%`]);
            return resFallback.rows.map(p => ({ ...p, club_name: 'Unknown' }));
        } catch (e2) {
            console.error("Fallback Search Error:", e2);
            return [];
        }
    }
}
