'use server';

import { getTournament } from './tournament-actions';

export async function debugGetTournament(id) {
    console.log('debugGetTournament called with ID:', id, typeof id);
    try {
        const data = await getTournament(id);
        console.log('getTournament result:', data ? 'Found' : 'Null');
        return { success: true, data };
    } catch (error) {
        console.error('debugGetTournament Error:', error);
        return {
            success: false,
            error: error.message,
            stack: error.stack,
            idReceived: id
        };
    }
}
