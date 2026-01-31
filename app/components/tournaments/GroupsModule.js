'use client';

export default function GroupsModule({ standings }) {
    // Filter out "General" or big groups to prevent layout breakage
    const groups = Object.keys(standings)
        .filter(key => key.toUpperCase() !== 'GENERAL' && key.toUpperCase() !== 'NULL')
        .sort();

    // Dynamic Grid Layout based on group count
    let desktopGridClass = "lg:grid-cols-4 lg:grid-rows-4"; // Default for large tournaments (13-16 groups)

    const count = groups.length;
    if (count <= 2) {
        desktopGridClass = "lg:grid-cols-1 lg:auto-rows-fr"; // Huge single column
    } else if (count <= 4) {
        desktopGridClass = "lg:grid-cols-2 lg:auto-rows-fr"; // 2x2 or 2xN
    } else if (count <= 6) {
        desktopGridClass = "lg:grid-cols-3 lg:auto-rows-fr"; // 3x2
    } else if (count <= 12) {
        desktopGridClass = "lg:grid-cols-4 lg:auto-rows-fr"; // 4x3 max
    }

    // Mobile: 1 col, Tablet/Landscape: 2 cols, Desktop: Adaptive
    const gridClass = `grid-cols-1 md:grid-cols-2 ${desktopGridClass}`;

    return (
        <div className="h-full w-full overflow-y-auto lg:overflow-hidden p-1 bg-[#0a192f]">
            <div className={`min-h-full lg:h-full w-full grid ${gridClass} gap-3 lg:gap-2 auto-rows-max lg:auto-rows-auto pb-8 lg:pb-0`}>
                {groups.map(groupKey => (
                    <div key={groupKey} className="min-h-0 min-w-0 bg-[#061020] border border-cyan-900/30 rounded flex flex-col shadow-sm">
                        {/* Compact Header */}
                        <div className="bg-[#050b16] py-1 px-2 border-b border-white/10 flex justify-between items-center shrink-0">
                            <span className="text-yellow-500 font-black uppercase text-xs lg:text-sm tracking-widest leading-none">
                                GRUPO {groupKey}
                            </span>
                        </div>

                        {/* Table */}
                        <div className="flex-1 flex flex-col w-full px-1 overflow-hidden">
                            <table className="w-full text-sm md:text-base lg:text-xs xl:text-sm text-left table-fixed font-medium h-full">
                                <thead className="h-[15%]">
                                    <tr className="text-cyan-400 border-b border-white/5 bg-[#030810]/50 text-[9px] lg:text-[11px]">
                                        <th className="w-[40%] p-1 font-bold">JUGADOR</th>
                                        <th className="w-[12%] text-center p-1 font-bold">PJ</th>
                                        <th className="w-[18%] text-center p-1 font-bold">GEN</th>
                                        <th className="w-[18%] text-center p-1 font-bold text-yellow-500">POND</th>
                                        <th className="w-[11%] text-center p-1 font-bold text-white">SM</th>
                                        <th className="w-[15%] text-center text-white p-1 font-black bg-white/5">PTS</th>
                                    </tr>
                                </thead>
                                <tbody className="leading-none">
                                    {standings[groupKey].slice(0, 4).map((p, i) => (
                                        <tr key={i} className={`${i < 2 ? 'text-white font-bold' : 'text-slate-400 font-normal'} border-b border-white/5 last:border-0 h-[21%]`}>
                                            <td className="p-1 truncate uppercase flex items-center gap-2 h-full">
                                                {p.photo_url && (
                                                    <div className="aspect-square h-[80%] rounded-full overflow-hidden border border-white/20 shrink-0">
                                                        <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <span className="truncate">{p.name.split(' ').slice(-1)[0]} <span className="text-[10px] opacity-70 ml-0.5">{p.name.charAt(0)}.</span></span>
                                            </td>
                                            <td className="p-1 text-center font-mono tracking-tighter">{p.played}</td>
                                            <td className="p-1 text-center text-slate-400 font-mono tracking-tighter">{p.average}</td>
                                            <td className="p-1 text-center text-yellow-500 font-mono tracking-tighter font-bold">{p.weightedAvg}</td>
                                            <td className="p-1 text-center text-white font-mono tracking-tighter">{p.highRun || 0}</td>
                                            <td className="p-1 text-center font-black bg-white/5 text-cyan-200 tracking-tighter">{p.points}</td>
                                        </tr>
                                    ))}
                                    {/* Fill empty rows if less than 4 players? No, slice(0,4) limits it. */}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
