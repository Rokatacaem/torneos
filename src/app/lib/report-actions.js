'use server';

import { getMatches } from './tournament-actions';

export async function generateWhatsAppReport(tournamentId, type) {
    try {
        const matches = await getMatches(tournamentId);
        let filtered = [];
        let title = "";

        // Sort matches: Group, then Round, then ID
        matches.sort((a, b) => {
            const gA = a.group_name || '';
            const gB = b.group_name || '';
            if (gA !== gB) return gA.localeCompare(gB, undefined, { numeric: true });
            if (a.round_number !== b.round_number) return a.round_number - b.round_number;
            return a.id - b.id;
        });

        if (type === 'start') {
            title = "🎱 *INICIO DE TORNEO - FASE DE GRUPOS*";
            // Filter: Group matches, Round 1, Scheduled
            // Also include matches that might be R1 but 'active'? usually 'scheduled'
            filtered = matches.filter(m =>
                m.phase_type === 'group' &&
                m.round_number === 1 &&
                m.status === 'scheduled'
            );
        } else if (type === 'pending') {
            title = "🎱 *PRÓXIMOS PARTIDOS*";
            // All scheduled matches
            filtered = matches.filter(m => m.status === 'scheduled');
        } else if (type === 'next_round') {
            title = "🎱 *SIGUIENTE RONDA*";
            // Filter: Scheduled matches NOT in Round 1 (if we want to separate)
            // or just all scheduled
            filtered = matches.filter(m =>
                m.phase_type === 'group' &&
                m.round_number > 1 &&
                m.status === 'scheduled'
            );
        }

        if (filtered.length === 0) return "⚠️ No hay partidos pendientes para este criterio.";

        // Group by Group Name
        const byGroup = {};
        filtered.forEach(m => {
            const g = m.group_name || 'Sin Grupo';
            if (!byGroup[g]) byGroup[g] = [];
            byGroup[g].push(m);
        });

        let report = `${title}\n\n`;

        const sortedGroups = Object.keys(byGroup).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        for (const gName of sortedGroups) {
            const groupMatches = byGroup[gName];
            const first = groupMatches[0];

            // Time and Table Info
            // Prioritize Match Table > Group Table
            // Since matches in a group might be on different tables if configured?
            // Usually in this app Group has a table.

            const time = first.group_start_time ? `🕒 ${first.group_start_time}` : '';
            // If all matches in filter have same table (group table), show it in header
            // If individual match tables exist, show in list
            const groupTable = first.group_table ? `Mesa ${first.group_table}` : '';

            report += `*GRUPO ${gName}* ${time}`;
            if (groupTable) report += ` - ${groupTable}`;
            report += `\n`;

            groupMatches.forEach(m => {
                const p1 = m.player1_name || 'TBD';
                const p2 = m.player2_name || 'TBD';
                // If match has specific table different from group? (Rare but possible)
                // m.table_number

                report += `🔸 ${p1} vs ${p2}\n`;
            });
            report += `\n`;
        }

        report += `_Generado por TorneosApp_ 🏆`;

        return report;
    } catch (e) {
        console.error("Error generating report:", e);
        return "Error al generar el reporte.";
    }
}
