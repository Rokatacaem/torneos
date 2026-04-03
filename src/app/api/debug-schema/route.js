import { query } from '@/app/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const tCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tournaments'");
        const pCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tournament_players'");

        return NextResponse.json({
            tournaments: tCols.rows.map(r => r.column_name),
            tournament_players: pCols.rows.map(r => r.column_name)
        });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
