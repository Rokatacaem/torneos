'use server';

import { getSession } from './auth';
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
