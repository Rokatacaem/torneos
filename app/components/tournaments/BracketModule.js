'use client';

import { useMemo } from 'react';

export default function BracketModule({ matches }) {
    // 1. Filter Elimination Matches
    // We ignore phases array and just look for round_number or type 'elimination'/'final' if available,
    // but relying on round_number is safer if they are all in one phase.
    const eliminationMatches = matches.filter(m =>
        (m.phase_type === 'elimination' || m.phase_type === 'final') && m.round_number > 0
    );

    if (eliminationMatches.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-[#0a192f] text-slate-500 text-sm">
                (Esperando Definición de Fases)
            </div>
        );
    }

    // 2. Identify Rounds
    // Group matches by round number
    const roundGroups = {};
    eliminationMatches.forEach(m => {
        if (!roundGroups[m.round_number]) roundGroups[m.round_number] = [];
        roundGroups[m.round_number].push(m);
    });

    const roundNumbers = Object.keys(roundGroups).map(Number).sort((a, b) => a - b);
    const maxRound = roundNumbers[roundNumbers.length - 1];

    // 3. Split Matches (Top Half vs Bottom Half) for Pre-Final Rounds
    const matchesByRound = { left: {}, right: {}, final: [] };

    roundNumbers.forEach(r => {
        const roundMatches = roundGroups[r].sort((a, b) => a.id - b.id);

        if (r === maxRound) {
            matchesByRound.final = roundMatches;
        } else {
            const mid = Math.ceil(roundMatches.length / 2);
            matchesByRound.left[r] = roundMatches.slice(0, mid);
            matchesByRound.right[r] = roundMatches.slice(mid);
        }
    });

    // 4. Rounds for Wings (Excluding Final)
    const wingRounds = roundNumbers.slice(0, -1);

    // Determines label (e.g., Round 1 -> 8vos, Round 2 -> 4tos)
    // We need to guess the "name" based on maxRound.
    // If maxRound is 4 (Final), then 3=Semi, 2=4tos, 1=8vos.
    // But round numbers might be arbitrary (1,2,3...). 
    // Usually Round 1 is the start.
    // Let's rely on standard logic: Max = Final.
    const getRoundName = (r) => {
        const diff = maxRound - r;
        if (diff === 0) return 'FINAL';
        if (diff === 1) return 'SEMIFINAL';
        if (diff === 2) return 'CUARTOS';
        if (diff === 3) return 'OCTAVOS';
        return `RONDA ${r}`;
    };

    return (
        <div className="h-full w-full flex bg-[#0a192f] border-r border-white/5 relative overflow-hidden">

            {/* --- LEFT WING --- */}
            <div className="flex-1 flex">
                {wingRounds.map((r) => (
                    <div key={`left-${r}`} className="flex-1 flex flex-col border-r border-white/5 last:border-0 relative">
                        {/* Round Title */}
                        <div className="text-center py-1 text-cyan-500 font-black uppercase text-[9px] lg:text-[10px] tracking-widest shrink-0 bg-[#061020]/80">
                            {getRoundName(r)}
                        </div>
                        {/* Matches */}
                        <div className="flex-1 flex flex-col justify-around px-1 py-1">
                            {matchesByRound.left[r]?.map((m, idx) => (
                                <div key={m.id} className="w-full flex justify-center relative">
                                    <BracketNode match={m} align="left" index={idx} />
                                </div>
                            )) || <div className="text-white/20 text-xs text-center">-</div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- CENTER FINAL --- */}
            <div className="min-w-[160px] lg:min-w-[220px] flex flex-col bg-[#050b16] border-x-4 border-yellow-600/20 relative z-10 shadow-2xl">
                <div className="text-center py-2 text-yellow-500 font-black uppercase text-xs lg:text-sm tracking-[0.2em] shrink-0 bg-black/40">
                    GRAN FINAL
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-2 gap-4">
                    {matchesByRound.final.map(m => (
                        <BracketNode key={m.id} match={m} isFinal={true} />
                    ))}
                </div>
            </div>

            {/* --- RIGHT WING (Reversed Order) --- */}
            <div className="flex-1 flex flex-row-reverse">
                {wingRounds.map((r) => (
                    <div key={`right-${r}`} className="flex-1 flex flex-col border-l border-white/5 first:border-0 relative">
                        {/* Round Title */}
                        <div className="text-center py-1 text-cyan-500 font-black uppercase text-[9px] lg:text-[10px] tracking-widest shrink-0 bg-[#061020]/80">
                            {getRoundName(r)}
                        </div>
                        {/* Matches */}
                        <div className="flex-1 flex flex-col justify-around px-1 py-1">
                            {matchesByRound.right[r]?.map((m, idx) => (
                                <div key={m.id} className="w-full flex justify-center relative">
                                    <BracketNode match={m} align="right" index={idx} />
                                </div>
                            )) || <div className="text-white/20 text-xs text-center">-</div>}
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}

function BracketNode({ match, align = 'left', isFinal = false, index }) {
    const isCompleted = match.status === 'completed';
    // Name truncation logic
    const getName = (n) => n ? n.split(' ').slice(-1)[0].substring(0, 10) : '...';

    const p1Name = match.player1_name ? getName(match.player1_name) : 'ESPERA';
    const p2Name = match.player2_name ? getName(match.player2_name) : 'ESPERA';

    const p1Win = isCompleted && match.winner_id === match.player1_id;
    const p2Win = isCompleted && match.winner_id === match.player2_id;

    // Connector Lines logic
    // We strictly use index parity to draw brackets: Even=Top, Odd=Bottom of the pair.
    // Left Wing: Lines go Right.
    // Right Wing: Lines go Left.
    const isTop = index !== undefined && index % 2 === 0;
    const isBottom = index !== undefined && index % 2 !== 0;

    if (isFinal) {
        return (
            <div className="w-full bg-[#08101c] border-2 border-yellow-500/50 rounded-lg p-3 shadow-[0_0_15px_rgba(234,179,8,0.2)] flex flex-col gap-2 relative z-20">
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
        <div className={`w-full max-w-[95%] rounded bg-[#3b82f6]/20 border border-[#3b82f6]/50 overflow-hidden shadow-md relative flex flex-col my-0.5 z-10`}>
            {/* Connector Lines (Pseudo-like absolute divs) */}
            {/* Horizontal Out Line */}
            <div className={`absolute top-1/2 w-4 h-[2px] bg-yellow-600/50 ${align === 'left' ? '-right-4' : '-left-4'}`}></div>

            {/* Vertical Bracket Line (Only roughly accurate if spacing is consistent) */}
            {/* We only draw a small tick up or down to hint closely */}
            <div className={`absolute w-[2px] bg-yellow-600/50 h-[150%] ${isTop ? 'top-1/2' : 'bottom-1/2'} ${align === 'left' ? '-right-4' : '-left-4'}`}></div>


            {/* Player 1 */}
            <div className={`flex justify-between items-center px-2 py-1 ${p1Win ? 'bg-yellow-500 text-black font-bold' : 'text-slate-300'}`}>
                {align === 'left' ? (
                    <>
                        <span className="truncate text-xs font-bold uppercase tracking-tight">
                            {p1Name}
                            <span className="text-[9px] text-cyan-500/70 ml-1">({match.player1_handicap || '-'})</span>
                        </span>
                        <span className={`ml-1 font-mono text-sm ${p1Win ? 'text-black' : 'text-white'}`}>{isCompleted ? match.score_p1 : '-'}</span>
                    </>
                ) : (
                    <>
                        <span className={`mr-1 font-mono text-sm ${p1Win ? 'text-black' : 'text-white'}`}>{isCompleted ? match.score_p1 : '-'}</span>
                        <span className="truncate text-xs font-bold uppercase tracking-tight text-right">
                            {p1Name}
                            <span className="text-[9px] text-cyan-500/70 ml-1">({match.player1_handicap || '-'})</span>
                        </span>
                    </>
                )}
            </div>

            <div className="h-[1px] bg-blue-500/30 w-full" />

            {/* Player 2 */}
            <div className={`flex justify-between items-center px-2 py-1 ${p2Win ? 'bg-yellow-500 text-black font-bold' : 'text-slate-300'}`}>
                {align === 'left' ? (
                    <>
                        <span className="truncate text-xs font-bold uppercase tracking-tight">
                            {p2Name}
                            <span className="text-[9px] text-cyan-500/70 ml-1">({match.player2_handicap || '-'})</span>
                        </span>
                        <span className={`ml-1 font-mono text-sm ${p2Win ? 'text-black' : 'text-white'}`}>{isCompleted ? match.score_p2 : '-'}</span>
                    </>
                ) : (
                    <>
                        <span className={`mr-1 font-mono text-sm ${p2Win ? 'text-black' : 'text-white'}`}>{isCompleted ? match.score_p2 : '-'}</span>
                        <span className="truncate text-xs font-bold uppercase tracking-tight text-right">
                            {p2Name}
                            <span className="text-[9px] text-cyan-500/70 ml-1">({match.player2_handicap || '-'})</span>
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}
