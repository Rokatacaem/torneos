import { NextResponse } from 'next/server';
import { query } from '@/app/lib/db';
import * as XLSX from 'xlsx';

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
                    p.ranking as "Ranking",
                    p.name as "Nombre", 
                    c.name as "Club",
                    p.average as "Promedio",
                    p.identification as "ID"
                FROM players p
                LEFT JOIN clubs c ON p.club_id = c.id
                ORDER BY 
                    CASE WHEN p.ranking > 0 THEN p.ranking ELSE 999999 END ASC, 
                    p.name ASC
            `);
            data = res.rows.map(row => ({
                Ranking: row.Ranking || 0,
                Nombre: row.Nombre,
                Club: row.Club || '',
                Promedio: row.Promedio || 0,
                ID: row.ID || ''
            }));
        }

        const worksheet = XLSX.utils.json_to_sheet(data, { header: ["Ranking", "Nombre", "Club", "Promedio", "ID"] });
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
