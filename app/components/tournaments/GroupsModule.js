'use client';

export default function GroupsModule({ standings }) {
    // Filter out "General" or big groups to prevent layout breakage
    const groups = Object.keys(standings)
        .filter(key => key.toUpperCase() !== 'GENERAL' && key.toUpperCase() !== 'NULL')
        .sort();

    return (
        <div className="h-full w-full overflow-hidden p-1 bg-[#0a192f]">
            <div className="h-full w-full grid grid-cols-4 grid-rows-4 gap-1.5 lg:gap-2">
                {groups.map(groupKey => (
                    <div key={groupKey} className="min-h-0 min-w-0 bg-[#061020] border border-cyan-900/30 rounded flex flex-col shadow-sm">

                        {/* Compact Header */}
                        <div className="bg-[#050b16] py-0.5 px-2 border-b border-white/10 flex justify-between items-center shrink-0">
                            <span className="text-yellow-500 font-black uppercase text-[10px] lg:text-xs tracking-widest leading-none">
                                G{groupKey}
                            </span>
                        </div>

                        {/* Table */}
                        <div className="flex-1 flex flex-col justify-evenly w-full px-1">
                            <table className="w-full text-[9px] lg:text-[11px] xl:text-xs text-left table-fixed font-medium">
                                <thead>
                                    <tr className="text-cyan-400 border-b border-white/5 bg-[#030810]/50 text-[8px] lg:text-[10px]">
                                        <th className="w-[45%] p-0.5 font-bold">JUGADOR</th>
                                        <th className="w-[15%] text-center p-0.5 font-bold">PJ</th>
                                        <th className="w-[25%] text-center p-0.5 font-bold">PROM</th>
                                        <th className="w-[15%] text-center text-white p-0.5 font-black bg-white/5">PTS</th>
                                    </tr>
                                </thead>
                                <tbody className="leading-none">
                                    {standings[groupKey].slice(0, 4).map((p, i) => (
                                        <tr key={i} className={`${i < 2 ? 'text-white font-bold' : 'text-slate-400 font-normal'} border-b border-white/5 last:border-0`}>
                                            <td className="p-0.5 truncate uppercase flex items-center gap-1">
                                                {p.photo_url && (
                                                    <div className="w-3 h-3 rounded-full overflow-hidden border border-white/20 shrink-0">
                                                        <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <span>{p.name.split(' ').slice(-1)[0]} <span className="text-[8px] opacity-70 ml-0.5">{p.name.charAt(0)}.</span></span>
                                            </td>
                                            <td className="p-0.5 text-center font-mono tracking-tighter">{p.played}</td>
                                            <td className="p-0.5 text-center text-yellow-500 font-mono tracking-tighter">{p.avg}</td>
                                            <td className="p-0.5 text-center font-black bg-white/5 text-cyan-200 tracking-tighter">{p.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
