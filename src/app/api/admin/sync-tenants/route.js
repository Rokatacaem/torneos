import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getSession } from '@/app/lib/session';

export async function GET() {
    const session = await getSession();
    
    if (!session || session.role !== 'superadmin') {
        return NextResponse.json({ error: 'No autorizado. Se requiere SuperAdmin.' }, { status: 403 });
    }

    try {
        console.log('[Rescate] Iniciando sincronización de Tenant IDs...');

        // 1. Sincronizar Torneos (hostClubId -> tenantId)
        const tournamentsToFix = await prisma.tournament.findMany({
            where: { tenantId: null, hostClubId: { not: null } }
        });

        let updatedTournaments = 0;
        for (const t of tournamentsToFix) {
            await prisma.tournament.update({
                where: { id: t.id },
                data: { tenantId: t.hostClubId }
            });
            updatedTournaments++;
        }

        // 2. Sincronizar Fases y Grupos (heredar del Torneo si están nulos)
        // (Opcional, usualmente Prisma lo maneja si el root está bien)

        // 3. Sincronizar Usuarios (clubId -> tenantId)
        const usersToFix = await prisma.user.findMany({
            where: { tenantId: null, clubId: { not: null } }
        });

        let updatedUsers = 0;
        for (const u of usersToFix) {
            await prisma.user.update({
                where: { id: u.id },
                data: { tenantId: u.clubId }
            });
            updatedUsers++;
        }

        return NextResponse.json({
            success: true,
            msg: `Rescate completado: ${updatedTournaments} torneos y ${updatedUsers} usuarios vinculados de nuevo.`,
            details: {
                tournaments: updatedTournaments,
                users: updatedUsers
            }
        });

    } catch (error) {
        console.error('[Rescate] Error en sincronización:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
