import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('id') || 34;

    try {
        console.log(`Debugging Tournament ${tournamentId}...`);

        // Check Phases
        const phases = await query('SELECT * FROM tournament_phases WHERE tournament_id = $1', [tournamentId]);

        // Check Matches Summary
        const matchesSummary = await query('SELECT count(*) as total, status, phase_id FROM tournament_matches WHERE tournament_id = $1 GROUP BY status, phase_id', [tournamentId]);

        // Check Sample Matches
        const sampleMatches = await query('SELECT id, phase_id, status FROM tournament_matches WHERE tournament_id = $1 LIMIT 10', [tournamentId]);

        return NextResponse.json({
            phases: phases.rows,
            matchesSummary: matchesSummary.rows,
            sampleMatches: sampleMatches.rows
        });
    } catch (error) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
