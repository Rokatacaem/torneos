import { query } from '@/app/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getSession();
    const role = session?.role;

    if (!['SUPERADMIN', 'superadmin'].includes(role)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    try {
        console.log("Iniciando purga de huérfanos...");
        
        // 1. Partidos huérfanos
        const resMatches = await query(`
            DELETE FROM tournament_matches 
            WHERE tournament_id NOT IN (SELECT id FROM tournaments)
        `);
        
        // 2. Jugadores de torneo huérfanos
        const resPlayers = await query(`
            DELETE FROM tournament_players 
            WHERE tournament_id NOT IN (SELECT id FROM tournaments)
        `);

        // 3. Fases huérfanas
        const resPhases = await query(`
            DELETE FROM tournament_phases 
            WHERE tournament_id NOT IN (SELECT id FROM tournaments)
        `);

        // 4. Grupos huérfanos (por si acaso)
        const resGroups = await query(`
            DELETE FROM tournament_groups 
            WHERE phase_id NOT IN (SELECT id FROM tournament_phases)
        `);

        return NextResponse.json({
            success: true,
            message: 'Limpieza completada',
            deleted: {
                matches: resMatches.rowCount,
                players: resPlayers.rowCount,
                phases: resPhases.rowCount,
                groups: resGroups.rowCount
            }
        });
    } catch (e) {
        console.error("Error en limpieza:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
