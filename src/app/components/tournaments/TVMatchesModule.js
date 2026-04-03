export default function TVMatchesModule({ matches }) {
    // Filter logic: Show matches from the latest active phase or just all matches passed?
    // TVDashboard should ideally filter matches before passing, or we filter here.
    // Let's assume matches passed are relevant (e.g. all matches or specific phase).
    // Better to show ALL active matches across tournament if mixed, or grouping by phase.

    // For now, simple grid of passed matches.
    // If empty
    if (!matches || matches.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="text-slate-500 italic text-2xl uppercase tracking-widest">No hay partidos en curso</div>
            </div>
        );
    }

    return (
        <div className="w-full h-full p-4 overflow-y-auto">
            <h2 className="text-center text-3xl font-black text-yellow-500 uppercase tracking-widest mb-6 drop-shadow-md">
                Partidos en Juego
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {matches.map(m => (
                    <div
                        key={m.id}
                        className={`
                            relative border rounded-xl p-4 shadow-xl overflow-hidden
                            ${m.status === 'in_progress' ? 'bg-[#0f2942] border-yellow-500/50' : 'bg-[#0a192f] border-white/5'}
                        `}
                    >
                        {/* Status Badge */}
                        <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-bl-lg bg-black/40 text-slate-400">
                            {m.status === 'in_progress' ? <span className="text-green-400 animate-pulse">● En Juego</span> :
                                m.status === 'completed' ? 'Finalizado' : 'Programado'}
                        </div>

                        {/* Meta */}
                        <div className="text-xs text-slate-500 mb-4 font-mono flex gap-2">
                            <span>Mesa {m.table_number || '?'}</span>
                            <span>• {m.phase_name || 'Fase'}</span>
                        </div>

                        {/* Players */}
                        <div className="space-y-4">
                            {/* P1 */}
                            <div className="flex justify-between items-center relative">
                                <div className={`flex-1 truncate font-bold text-lg ${m.winner_id === m.player1_id ? 'text-green-400' : 'text-white'}`}>
                                    {m.player1_name || 'BYE'}
                                    {m.player1_handicap && <span className="text-xs text-yellow-500/60 ml-2 font-mono">({m.player1_handicap})</span>}
                                </div>
                                <div className="text-3xl font-black font-mono w-[60px] text-right text-yellow-500">
                                    {m.score_p1 || 0}
                                </div>
                            </div>

                            {/* Divider if needed, or just space */}

                            {/* P2 */}
                            <div className="flex justify-between items-center relative">
                                <div className={`flex-1 truncate font-bold text-lg ${m.winner_id === m.player2_id ? 'text-green-400' : 'text-white'}`}>
                                    {m.player2_name || 'BYE'}
                                    {m.player2_handicap && <span className="text-xs text-yellow-500/60 ml-2 font-mono">({m.player2_handicap})</span>}
                                </div>
                                <div className="text-3xl font-black font-mono w-[60px] text-right text-yellow-500">
                                    {m.score_p2 || 0}
                                </div>
                            </div>
                        </div>

                        {/* Innings if available */}
                        {(m.innings > 0) && (
                            <div className="mt-4 pt-2 border-t border-white/5 flex justify-between text-xs text-slate-500 font-mono">
                                <span>Entradas: {m.innings}</span>
                                {m.high_run_p1 > 0 || m.high_run_p2 > 0 ? (
                                    <span>Mayor Serie: {Math.max(m.high_run_p1 || 0, m.high_run_p2 || 0)}</span>
                                ) : null}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
