import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import { generatePlayoffs } from '@/app/lib/tournament-actions';
import { revalidatePath } from 'next/cache';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('id');

    if (!tournamentId) {
        return NextResponse.json({ error: 'Missing tournament ID' }, { status: 400 });
    }

    try {
        console.log(`Regenerating playoffs for tournament ${tournamentId}...`);

        // 1. Delete existing Elimination Phase and Matches
        // Find elimination phases
        const phasesRes = await query(`SELECT id FROM tournament_phases WHERE tournament_id = $1 AND type IN ('elimination', 'final', 'elimination_prelim')`, [tournamentId]);

        for (const row of phasesRes.rows) {
            console.log(`Deleting phase ${row.id}`);
            // Delete matches
            await query(`DELETE FROM matches WHERE phase_id = $1`, [row.id]);
            // Delete phase
            await query(`DELETE FROM tournament_phases WHERE id = $1`, [row.id]);
        }

        // 2. Clear "is_qualified" status? 
        // generatePlayoffs usually expects qualifiers to be determined. 
        // It calculates them from group standings.
        // So we don't need to reset anything else.

        // 3. Generate Playoffs
        const result = await generatePlayoffs(tournamentId);

        revalidatePath(`/tournaments/${tournamentId}`);
        revalidatePath(`/admin/tournaments/${tournamentId}`);

        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error('Error regenerating playoffs:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
