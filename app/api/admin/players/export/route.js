import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import * as XLSX from 'xlsx';
import { calculateFechillarHandicap } from '@/app/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const isTemplate = searchParams.get('template') === 'true';

    try {
        let data = [];

        if (isTemplate) {
            data = [
                { Nombre: '', Club: '' }
            ];
        } else {
            const res = await query(`
                SELECT 
                    p.ranking as "ranking_pts",
                    p.category as "category",
                    p.tournaments_played as "tournaments_played",
                    p.ranking_annual as "ranking_annual",
                    p.tournaments_played_annual as "tournaments_played_annual",
                    p.name as "Nombre", 
                    c.name as "Club",
                    p.average as "Promedio",
                    p.id as "ID_BD"
                FROM players p
                LEFT JOIN clubs c ON p.club_id = c.id
                ORDER BY 
                    CASE WHEN p.ranking > 0 THEN p.ranking ELSE 999999 END ASC, 
                    p.name ASC
            `);
            data = res.rows.map(row => ({
                'Pts Nacional': row.ranking_pts || '',
                Categoria: row.category || 'C',
                Nombre: row.Nombre,
                Club: row.Club || '',
                Torneos: row.tournaments_played || 0,
                'Torneos (Año)': row.tournaments_played_annual || 0,
                'Pts Anual': row.ranking_annual || 0,
                Promedio: row.Promedio || '',
                HCP: row.Promedio ? calculateFechillarHandicap(row.Promedio) : '',
                ID_BD: row.ID_BD   // Internal DB id - DO NOT modify this column
            }));
        }

        const worksheet = XLSX.utils.json_to_sheet(data, { header: ["Pts Nacional", "Categoria", "Nombre", "Club", "Torneos", "Torneos (Año)", "Pts Anual", "Promedio", "HCP", "ID_BD"] });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Jugadores");

        const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        const filename = isTemplate ? "plantilla_jugadores.xlsx" : `jugadores_${new Date().toISOString().split('T')[0]}.xlsx`;

        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });
    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
