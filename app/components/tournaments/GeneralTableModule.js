'use client';

export default function GeneralTableModule({ standings }) {
    return (
        <div className="h-full flex flex-col bg-[#0a192f]">
            <div className="flex-1 overflow-y-auto w-full custom-scrollbar p-1">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#061020] z-10 text-cyan-400 font-black uppercase border-b-2 border-white/10 shadow-lg text-[9px] lg:text-[10px] tracking-wider leading-none">
                        <tr>
                            <th className="py-1 px-1 text-center bg-[#061020]">#</th>
                            <th className="py-1 px-2 bg-[#061020] text-sm lg:text-base">JUGADOR</th>
                            <th className="py-1 px-1 text-center text-slate-400 bg-[#061020]" title="Partidos Jugados">P</th>
                            <th className="py-1 px-1 text-center text-slate-500 bg-[#061020]" title="Handicap">HD</th>
                            <th className="py-1 px-1 text-center text-slate-400 bg-[#061020]" title="Carambolas">C</th>
                            <th className="py-1 px-1 text-center text-slate-400 bg-[#061020]" title="Entradas">E</th>
                            <th className="py-1 px-1 text-center text-white bg-[#061020]" title="Serie Mayor">SM</th>
                            <th className="py-1 px-1 text-center text-yellow-500 bg-[#061020] text-xs lg:text-sm" title="Promedio General">PG</th>
                            <th className="py-1 px-1 text-center text-green-500 bg-[#061020] text-xs lg:text-sm" title="Promedio Ponderado">PP</th>
                            <th className="py-1 px-2 text-center text-white bg-[#061020] text-xs lg:text-sm">PTS</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {standings.map((p, i) => (
                            <tr key={p.id} className="hover:bg-white/5 transition-colors odd:bg-white/[0.02]">
                                <td className="py-0.5 px-1 text-center text-slate-500 font-mono font-bold text-xs lg:text-sm">{i + 1}</td>
                                <td className="py-0.5 px-2 text-white font-bold truncate max-w-[150px] uppercase text-xs lg:text-sm tracking-tight flex items-center gap-2">
                                    {p.photo_url && (
                                        <div className="w-5 h-5 rounded-full overflow-hidden border border-white/20 shrink-0">
                                            <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <span className="truncate">
                                        {p.name}
                                        <span className="ml-1 text-[9px] text-cyan-600 font-black hidden xl:inline tracking-wider">{p.clubCode?.split('.')[0]}</span>
                                    </span>
                                </td>
                                <td className="py-0.5 text-center text-slate-400 font-mono text-[10px] lg:text-xs">{p.played}</td>
                                <td className="py-0.5 text-center text-slate-500 font-mono text-[10px] lg:text-xs">{p.handicap}</td>
                                <td className="py-0.5 text-center text-cyan-200/60 font-mono text-[10px] lg:text-xs">{p.scoreFor}</td>
                                <td className="py-0.5 text-center text-cyan-200/60 font-mono text-[10px] lg:text-xs">{p.innings}</td>
                                <td className="py-0.5 text-center text-white/90 font-black text-xs lg:text-sm">{p.highRun}</td>
                                <td className="py-0.5 text-center text-yellow-400 font-mono font-black text-sm lg:text-base">{p.generalAvg}</td>
                                <td className="py-0.5 text-center text-green-400 font-mono font-black text-sm lg:text-base">{p.weightedAvg}</td>
                                <td className="py-0.5 text-center text-white font-black bg-slate-900/40 text-sm lg:text-base">{p.points}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
