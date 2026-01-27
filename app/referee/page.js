import { query } from '@/app/lib/db';
import Link from 'next/link';
import { Trophy, Calendar, ArrowLeft, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getActiveTournaments() {
    const res = await query(`
        SELECT DISTINCT t.id, t.name, t.start_date, t.end_date, t.logo_image_url
        FROM tournaments t
        JOIN tournament_matches m ON t.id = m.tournament_id
        WHERE m.status IN ('scheduled', 'in_progress')
        ORDER BY t.start_date DESC
    `);
    return res.rows;
}

async function getActiveMatches(tournamentId) {
    let queryStr = `
        SELECT m.*, 
               p1.player_name as player1_name, 
               p2.player_name as player2_name,
               g.name as group_name,
               ph.name as phase_name,
               ph.type as phase_type,
               t.group_points_limit,
               t.playoff_points_limit,
               t.group_innings_limit,
               t.playoff_innings_limit,
               t.format,
               t.name as tournament_name
        FROM tournament_matches m
        JOIN tournaments t ON m.tournament_id = t.id
        JOIN tournament_phases ph ON m.phase_id = ph.id
        LEFT JOIN tournament_groups g ON m.group_id = g.id
        LEFT JOIN tournament_players p1 ON m.player1_id = p1.id
        LEFT JOIN tournament_players p2 ON m.player2_id = p2.id
        WHERE m.status IN ('scheduled', 'in_progress')
    `;

    const params = [];
    if (tournamentId) {
        queryStr += ` AND m.tournament_id = $1`;
        params.push(tournamentId);
    }

    queryStr += ` ORDER BY m.updated_at DESC, m.id DESC`;

    const res = await query(queryStr, params);
    return res.rows;
}

export default async function RefereePage({ searchParams }) {
    // Await searchParams as required by Next.js 15+ (if user is on latest version, but good practice anyway)
    // Actually current project seems to be Next 14/15, but let's assume async access if possible or direct.
    // In server components, props are promises in newer versions.
    const sp = await searchParams;
    const selectedTournamentId = sp?.tournamentId;

    // 1. If Tournament Selected, Show Matches
    if (selectedTournamentId) {
        const matches = await getActiveMatches(selectedTournamentId);
        // Get tournament name from first match or fetch separately? 
        // Let's fetch tournament details separately to be safe if no matches found but ID selected
        const tournamentName = matches.length > 0 ? matches[0].tournament_name : "Torneo";

        return (
            <div className="min-h-screen bg-slate-950 text-white p-4">
                <header className="mb-6 flex justify-between items-center border-b border-white/10 pb-4">
                    <div className="flex items-center gap-4">
                        <Link href="/referee" className="bg-slate-800 p-2 rounded-full hover:bg-slate-700 transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-orange-500">Panel de Jueces</h1>
                            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{tournamentName}</div>
                        </div>
                    </div>
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 animate-pulse">En Vivo</span>
                </header>

                <MatchesList matches={matches} />
            </div>
        );
    }

    // 2. No Tournament Selected: Check Active Options
    const activeTournaments = await getActiveTournaments();

    // Case A: No active tournaments
    if (activeTournaments.length === 0) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
                <Trophy size={64} className="text-slate-800 mb-4" />
                <h1 className="text-xl font-bold text-slate-500">No hay torneos activos</h1>
                <p className="text-slate-600 mt-2">No se encontraron partidos programados o en progreso.</p>
            </div>
        );
    }

    // Case B: Single Active Tournament -> Redirect (or just render matches directly to avoid redirect flicker)
    // We render directly for better UX
    if (activeTournaments.length === 1) {
        const matches = await getActiveMatches(activeTournaments[0].id);
        return (
            <div className="min-h-screen bg-slate-950 text-white p-4">
                <header className="mb-6 flex justify-between items-center border-b border-white/10 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-orange-500">Panel de Jueces</h1>
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{activeTournaments[0].name}</div>
                    </div>
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 animate-pulse">En Vivo</span>
                </header>
                <MatchesList matches={matches} />
            </div>
        );
    }

    // Case C: Multiple Active Tournaments -> Show Selection
    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
            <header className="mb-12 text-center">
                <h1 className="text-3xl font-black text-orange-500 uppercase tracking-widest mb-2">Panel de Jueces</h1>
                <p className="text-slate-400">Selecciona el torneo para arbitrar</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
                {activeTournaments.map(t => (
                    <Link key={t.id} href={`/referee?tournamentId=${t.id}`} className="group relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <div className="relative bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-xl hover:-translate-y-1 transition-transform h-full flex flex-col">

                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-slate-950 rounded-xl border border-white/5 shadow-inner">
                                    {t.logo_image_url ? (
                                        <img src={t.logo_image_url} alt="Logo" className="w-12 h-12 object-contain" />
                                    ) : (
                                        <Trophy className="w-8 h-8 text-slate-600" />
                                    )}
                                </div>
                                <div className="bg-green-500/10 text-green-400 text-[10px] font-bold px-2 py-1 rounded-full border border-green-500/20 uppercase">
                                    En Curso
                                </div>
                            </div>

                            <h2 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-amber-400 transition-colors">
                                {t.name}
                            </h2>

                            <div className="mt-auto pt-4 flex items-center gap-2 text-xs text-slate-500 font-medium border-t border-white/5">
                                <Calendar size={14} />
                                <span>Iniciado: {new Date(t.start_date).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

function MatchesList({ matches }) {
    if (matches.length === 0) {
        return (
            <div className="text-center py-10 text-slate-500 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                No hay partidos activos o programados en este momento.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {matches.map(m => (
                <Link key={m.id} href={`/referee/${m.id}`}>
                    <div className="bg-slate-900 border border-white/10 rounded-xl p-4 active:scale-95 transition-transform hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/5 group">
                        <div className="flex justify-between text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">
                            <span className="group-hover:text-orange-400 transition-colors">Mesa {m.table_number || '?'}</span>
                            <span>{m.phase_name} {m.group_name ? `- G${m.group_name}` : ''}</span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 text-right">
                                <div className="font-bold text-lg leading-tight truncate text-slate-200">{m.player1_name || 'TBD'}</div>
                                <div className="text-2xl font-mono font-black text-orange-500 tabular-nums">{m.score_p1 || 0}</div>
                            </div>
                            <div className="text-slate-700 font-bold text-sm">VS</div>
                            <div className="flex-1 text-left">
                                <div className="font-bold text-lg leading-tight truncate text-slate-200">{m.player2_name || 'TBD'}</div>
                                <div className="text-2xl font-mono font-black text-orange-500 tabular-nums">{m.score_p2 || 0}</div>
                            </div>
                        </div>

                        {(() => {
                            const target = m.phase_type === 'group' ? m.group_points_limit : m.playoff_points_limit;
                            const isFinished = target && ((m.score_p1 || 0) >= target || (m.score_p2 || 0) >= target);

                            if (isFinished) {
                                return (
                                    <div className="mt-2 text-center text-xs text-red-400 font-bold border-t border-white/5 pt-2 animate-pulse flex items-center justify-center gap-2">
                                        <span>TERMINADO</span>
                                        <ExternalLink size={12} />
                                    </div>
                                );
                            }
                            return (
                                <div className="mt-2 text-center text-xs text-green-500/80 font-medium border-t border-white/5 pt-2 group-hover:text-green-400 transition-colors">
                                    Toca para Controlar
                                </div>
                            );
                        })()}
                    </div>
                </Link>
            ))}
        </div>
    );
}
