import { query } from '@/app/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getActiveMatches() {
    const res = await query(`
        SELECT m.*, 
               p1.player_name as player1_name, 
               p2.player_name as player2_name,
               g.name as group_name,
               ph.name as phase_name
        FROM tournament_matches m
        JOIN tournament_phases ph ON m.phase_id = ph.id
        LEFT JOIN tournament_groups g ON m.group_id = g.id
        LEFT JOIN tournament_players p1 ON m.player1_id = p1.id
        LEFT JOIN tournament_players p2 ON m.player2_id = p2.id
        WHERE m.status IN ('scheduled', 'in_progress')
        ORDER BY m.updated_at DESC, m.id DESC
    `);
    return res.rows;
}

export default async function RefereePage() {
    const matches = await getActiveMatches();

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4">
            <header className="mb-6 flex justify-between items-center border-b border-white/10 pb-4">
                <h1 className="text-2xl font-bold text-orange-500">Panel de Jueces</h1>
                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">En Vivo</span>
            </header>

            <div className="space-y-4">
                {matches.length === 0 && (
                    <div className="text-center py-10 text-slate-500">
                        No hay partidos activos o programados.
                    </div>
                )}

                {matches.map(m => (
                    <Link key={m.id} href={`/referee/${m.id}`}>
                        <div className="bg-slate-900 border border-white/10 rounded-xl p-4 active:scale-95 transition-transform hover:border-orange-500/50">
                            <div className="flex justify-between text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">
                                <span>Mesa {m.table_number || '?'}</span>
                                <span>{m.phase_name} {m.group_name ? `- G${m.group_name}` : ''}</span>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 text-right">
                                    <div className="font-bold text-lg leading-tight truncate">{m.player1_name || 'TBD'}</div>
                                    <div className="text-2xl font-mono font-black text-orange-400">{m.score_p1 || 0}</div>
                                </div>
                                <div className="text-slate-600 font-bold text-sm">VS</div>
                                <div className="flex-1 text-left">
                                    <div className="font-bold text-lg leading-tight truncate">{m.player2_name || 'TBD'}</div>
                                    <div className="text-2xl font-mono font-black text-orange-400">{m.score_p2 || 0}</div>
                                </div>
                            </div>

                            <div className="mt-2 text-center text-xs text-green-400 font-medium border-t border-white/5 pt-2">
                                Toca para Controlar
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
