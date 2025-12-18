'use client';

import { useState } from 'react';
import { calculateGroupStandings } from '@/app/lib/standings-utils';
import BracketView from './BracketView';

export default function PublicTournamentView({ tournament, matches, players }) {
    const [view, setView] = useState('groups'); // groups, matches

    // Agrupar partidos por fase y grupo
    const phases = {};
    matches.forEach(m => {
        if (!phases[m.phase_name]) phases[m.phase_name] = {};
        const groupKey = m.group_name || 'General';
        if (!phases[m.phase_name][groupKey]) phases[m.phase_name][groupKey] = [];
        phases[m.phase_name][groupKey].push(m);
    });

    return (
        <div className="space-y-8">
            {Object.entries(phases).map(([phaseName, groups]) => {
                const groupStandings = calculateGroupStandings(matches);

                return (
                    <div key={phaseName} className="space-y-8">
                        <h2 className="text-3xl font-bold border-l-8 border-blue-500 pl-4 text-white tracking-tight">{phaseName}</h2>

                        {Object.entries(groups).map(([groupName, groupMatches]) => (
                            <div key={groupName} className="bg-card border border-white/5 rounded-xl p-6 shadow-sm">

                                <div className="flex flex-col xl:flex-row gap-8">
                                    {/* Tabla de Posiciones */}
                                    <div className="xl:w-1/3 space-y-4">
                                        <div className="flex items-center justify-between text-blue-400 px-1 border-b border-white/5 pb-2">
                                            <h3 className="font-bold text-lg">Grupo {groupName}</h3>
                                            <span className="text-xs uppercase tracking-wider font-semibold opacity-70">Posiciones</span>
                                        </div>
                                        <div className="bg-[#0B1120] border border-white/10 rounded-xl overflow-hidden shadow-lg">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-white/5 text-slate-400 border-b border-white/5">
                                                        <th className="px-4 py-3 text-left font-medium">Jugador</th>
                                                        <th className="px-2 py-3 text-center font-medium w-10">PJ</th>
                                                        <th className="px-2 py-3 text-center font-medium w-10">PG</th>
                                                        <th className="px-2 py-3 text-center font-medium w-14">PROM</th>
                                                        <th className="px-2 py-3 text-center font-bold text-white w-12">PTS</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {groupStandings[groupName]?.map((p, idx) => (
                                                        <tr key={p.id} className="group hover:bg-white/5 transition-colors">
                                                            <td className="px-4 py-2.5 font-medium text-slate-200 flex items-center gap-2">
                                                                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${idx < 2 ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="truncate max-w-[120px]" title={p.name}>{p.name}</span>
                                                            </td>
                                                            <td className="px-2 py-2.5 text-center text-slate-500">{p.played}</td>
                                                            <td className="px-2 py-2.5 text-center text-slate-500">{p.won}</td>
                                                            <td className="px-2 py-2.5 text-center text-yellow-500 font-mono text-xs">{p.average}</td>
                                                            <td className="px-2 py-2.5 text-center font-bold text-white">{p.points}</td>
                                                        </tr>
                                                    ))}
                                                    {(!groupStandings[groupName] || groupStandings[groupName].length === 0) && (
                                                        <tr>
                                                            <td colSpan={4} className="p-4 text-center text-slate-500 text-xs text-muted-foreground">Sin datos</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Partidos */}
                                    <div className="xl:w-2/3 space-y-4">
                                        <div className="flex items-center justify-between text-slate-400 px-1 border-b border-white/5 pb-2">
                                            <h3 className="font-bold text-lg">Partidos</h3>
                                            <span className="text-xs uppercase tracking-wider font-semibold opacity-70">Resultados</span>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            {groupMatches.map(m => (
                                                <div key={m.id} className="bg-[#0B1120] border border-white/10 rounded-xl overflow-hidden shadow-sm hover:border-blue-500/30 transition-all duration-300 group">
                                                    <div className="bg-black/20 px-4 py-2 flex justify-between items-center border-b border-white/5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${m.status === 'completed' ? 'bg-green-500' : 'bg-slate-600'}`}></span>
                                                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                                                                {m.status === 'completed' ? 'Finalizado' : 'Mesa ' + (m.table_number || '-')}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 flex items-center justify-between gap-4">
                                                        <div className={`flex-1 text-right font-bold truncate transition-colors ${m.score_p1 > m.score_p2 ? 'text-blue-400' : 'text-slate-300'}`}>
                                                            {m.player1_name || 'BYE'}
                                                        </div>

                                                        <div className="bg-background border border-white/10 rounded-lg px-2 py-1 flex items-center justify-center min-w-[3rem]">
                                                            {m.status === 'scheduled' ? (
                                                                <span className="text-xs font-bold text-slate-600">VS</span>
                                                            ) : (
                                                                <div className="flex items-center gap-1 font-mono font-black text-white text-lg">
                                                                    <span>{m.score_p1}</span>
                                                                    <span className="text-slate-600 text-xs mx-0.5">:</span>
                                                                    <span>{m.score_p2}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className={`flex-1 text-left font-bold truncate transition-colors ${m.score_p2 > m.score_p1 ? 'text-blue-400' : 'text-slate-300'}`}>
                                                            {m.player2_name || 'BYE'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            })}

            {matches.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    El fixture aún no ha sido generado.
                </div>
            )}
        </div>
    );
}
