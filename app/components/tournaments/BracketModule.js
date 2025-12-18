'use client';

import { useMemo } from 'react';

export default function BracketModule({ matches, phases }) {
    // 1. Filter Phases
    const eliminationPhases = phases.filter(p => {
        if (p.type === 'elimination' || p.type === 'final') return true;
        const lowerName = p.name.toLowerCase();
        return !lowerName.includes('grupo') && !lowerName.includes('group');
    }).sort((a, b) => a.order - b.order);

    if (eliminationPhases.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-[#0a192f] text-slate-500 text-sm">
                (Esperando Definición de Fases)
            </div>
        );
    }

    // 2. Identify Final and Pre-Final Phases
    const finalPhase = eliminationPhases[eliminationPhases.length - 1]; // Assume last is final
    const preFinalPhases = eliminationPhases.slice(0, eliminationPhases.length - 1);

    // 3. Split Matches for Pre-Final Phases (Top Half vs Bottom Half)
    const matchesByPhase = useMemo(() => {
        const map = { left: {}, right: {}, final: [] };

        preFinalPhases.forEach(p => {
            // Sort matches to ensure deterministic split
            const phaseMatches = matches.filter(m => m.phase_id === p.id).sort((a, b) => a.id - b.id);
            const mid = Math.ceil(phaseMatches.length / 2);
            map.left[p.id] = phaseMatches.slice(0, mid);
            map.right[p.id] = phaseMatches.slice(mid);
        });

        if (finalPhase) {
            map.final = matches.filter(m => m.phase_id === finalPhase.id);
        }

        return map;
    }, [matches, preFinalPhases, finalPhase]);

    // Butterfly Layout: [LEFT WING] [FINAL] [RIGHT WING]
    // Left Wing: 16vos -> Oct -> Qtr -> Semi
    // Right Wing: Semi <- Qtr <- Oct <- 16vos (Reversed visual order)

    return (
        <div className="h-full w-full flex bg-[#0a192f] border-r border-white/5 relative overflow-hidden">

            {/* --- LEFT WING --- */}
            <div className="flex-1 flex">
                {preFinalPhases.map((phase) => (
                    <div key={`left-${phase.id}`} className="flex-1 flex flex-col border-r border-white/5 last:border-0 relative">
                        {/* Phase Title */}
                        <div className="text-center py-1 text-cyan-500 font-black uppercase text-[9px] lg:text-[10px] tracking-widest shrink-0 bg-[#061020]/80">
                            {phase.name.replace(' de Final', '').replace('Semifinal', 'Semi')}
                        </div>
                        {/* Matches */}
                        <div className="flex-1 flex flex-col justify-around px-1 py-1">
                            {matchesByPhase.left[phase.id].map(m => (
                                <div key={m.id} className="w-full flex justify-center">
                                    <BracketNode match={m} align="left" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- CENTER FINAL --- */}
            <div className="min-w-[140px] lg:min-w-[180px] flex flex-col bg-[#050b16] border-x-4 border-yellow-600/20 relative z-10 shadow-2xl">
                <div className="text-center py-2 text-yellow-500 font-black uppercase text-xs lg:text-sm tracking-[0.2em] shrink-0 bg-black/40">
                    GRAN FINAL
                </div>
                <div className="flex-1 flex items-center justify-center p-2">
                    {matchesByPhase.final.map(m => (
                        <BracketNode key={m.id} match={m} isFinal={true} />
                    ))}
                </div>
            </div>

            {/* --- RIGHT WING (Reversed Order) --- */}
            <div className="flex-1 flex flex-row-reverse">
                {preFinalPhases.map((phase) => (
                    <div key={`right-${phase.id}`} className="flex-1 flex flex-col border-l border-white/5 first:border-0 relative">
                        {/* Phase Title */}
                        <div className="text-center py-1 text-cyan-500 font-black uppercase text-[9px] lg:text-[10px] tracking-widest shrink-0 bg-[#061020]/80">
                            {phase.name.replace(' de Final', '').replace('Semifinal', 'Semi')}
                        </div>
                        {/* Matches */}
                        <div className="flex-1 flex flex-col justify-around px-1 py-1">
                            {matchesByPhase.right[phase.id].map(m => (
                                <div key={m.id} className="w-full flex justify-center">
                                    <BracketNode match={m} align="right" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}

function BracketNode({ match, align = 'left', isFinal = false }) {
    const isCompleted = match.status === 'completed';
    // Name truncation logic
    const getName = (n) => n ? n.split(' ').slice(-1)[0].substring(0, 10) : '...';

    const p1Name = match.player1_name ? getName(match.player1_name) : 'ESPERA';
    const p2Name = match.player2_name ? getName(match.player2_name) : 'ESPERA';

    const p1Win = isCompleted && match.winner_id === match.player1_id;
    const p2Win = isCompleted && match.winner_id === match.player2_id;

    if (isFinal) {
        return (
            <div className="w-full bg-[#08101c] border-2 border-yellow-500/50 rounded-lg p-3 shadow-[0_0_15px_rgba(234,179,8,0.2)] flex flex-col gap-2">
                <div className={`flex justify-between items-center p-2 rounded ${p1Win ? 'bg-yellow-500 text-black font-black' : 'bg-white/5 text-white'}`}>
                    <span className="text-sm lg:text-lg">{p1Name}</span>
                    <span className="text-lg lg:text-2xl font-mono font-bold">{isCompleted ? match.score_p1 : '-'}</span>
                </div>
                <div className="text-center text-[10px] text-slate-500 font-bold tracking-widest">VS</div>
                <div className={`flex justify-between items-center p-2 rounded ${p2Win ? 'bg-yellow-500 text-black font-black' : 'bg-white/5 text-white'}`}>
                    <span className="text-sm lg:text-lg">{p2Name}</span>
                    <span className="text-lg lg:text-2xl font-mono font-bold">{isCompleted ? match.score_p2 : '-'}</span>
                </div>
                {isCompleted && (
                    <div className="absolute -bottom-8 left-0 w-full text-center">
                        <span className="text-yellow-400 font-bold text-[10px] uppercase tracking-widest animate-pulse">Campeón</span>
                    </div>
                )}
            </div>
        )
    }

    // Standard Node
    return (
        <div className={`w-full max-w-[95%] border-y border-${align === 'left' ? 'l' : 'r'}-4 border-cyan-900/40 rounded bg-[#0f1f3a] overflow-hidden shadow-md relative flex flex-col my-0.5`}>
            {/* Player 1 */}
            <div className={`flex justify-between items-center px-1.5 py-0.5 lg:py-1 ${p1Win ? 'bg-yellow-500/20 text-yellow-400 font-bold' : 'text-slate-400'}`}>
                {align === 'left' ? (
                    <>
                        <span className="truncate text-[9px] lg:text-[10px] leading-none uppercase">{p1Name}</span>
                        <span className={`ml-1 font-mono text-[9px] lg:text-xs ${p1Win ? 'text-white' : 'opacity-50'}`}>{isCompleted ? match.score_p1 : '-'}</span>
                    </>
                ) : (
                    <>
                        <span className={`mr-1 font-mono text-[9px] lg:text-xs ${p1Win ? 'text-white' : 'opacity-50'}`}>{isCompleted ? match.score_p1 : '-'}</span>
                        <span className="truncate text-[9px] lg:text-[10px] leading-none uppercase text-right">{p1Name}</span>
                    </>
                )}
            </div>

            <div className="h-[1px] bg-white/5 w-full" />

            {/* Player 2 */}
            <div className={`flex justify-between items-center px-1.5 py-0.5 lg:py-1 ${p2Win ? 'bg-yellow-500/20 text-yellow-400 font-bold' : 'text-slate-400'}`}>
                {align === 'left' ? (
                    <>
                        <span className="truncate text-[9px] lg:text-[10px] leading-none uppercase">{p2Name}</span>
                        <span className={`ml-1 font-mono text-[9px] lg:text-xs ${p2Win ? 'text-white' : 'opacity-50'}`}>{isCompleted ? match.score_p2 : '-'}</span>
                    </>
                ) : (
                    <>
                        <span className={`mr-1 font-mono text-[9px] lg:text-xs ${p2Win ? 'text-white' : 'opacity-50'}`}>{isCompleted ? match.score_p2 : '-'}</span>
                        <span className="truncate text-[9px] lg:text-[10px] leading-none uppercase text-right">{p2Name}</span>
                    </>
                )}
            </div>
        </div>
    );
}
