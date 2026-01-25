'use client';

import { useState } from 'react';
import { calculateFechillarHandicap } from '@/app/lib/utils';
import { getPlayerFullHistory } from '@/app/lib/player-actions';
import PlayerHistoryModal from '@/app/components/ranking/PlayerHistoryModal';
import { Trophy, Info, ArrowRight, ArrowDownUp, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function RankingTable({ initialRanking }) {
    const [rankingType, setRankingType] = useState('national'); // 'national' | 'annual'
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [historyData, setHistoryData] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    async function handlePlayerClick(player) {
        if (loadingHistory) return;
        setLoadingHistory(true);
        try {
            const data = await getPlayerFullHistory(player.id);
            setHistoryData(data);
            setSelectedPlayer(player);
        } catch (error) {
            console.error('Error loading history:', error);
            alert('Error al cargar historial del jugador.');
        } finally {
            setLoadingHistory(false);
        }
    }

    // Sort data based on selection
    const sortedRanking = [...initialRanking].sort((a, b) => {
        if (rankingType === 'national') {
            return (b.ranking || 0) - (a.ranking || 0);
        } else {
            return (b.ranking_annual || 0) - (a.ranking_annual || 0);
        }
    });

    return (
        <div className="space-y-8">
            {/* Info Cards & Toggle */}
            <div className="flex flex-col md:flex-row gap-6">

                {/* Selector / Toggle - Mobile Optimized */}
                <div className="md:w-1/3 flex flex-col gap-4">
                    <div className="bg-[#1A2333] border border-white/5 rounded-xl p-5 shadow-lg h-full">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <ArrowDownUp size={18} className="text-blue-400" />
                            Ordenar Ranking
                        </h3>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => setRankingType('national')}
                                className={`
                                    p-4 rounded-lg border text-left transition-all relative overflow-hidden group
                                    ${rankingType === 'national'
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10'}
                                `}
                            >
                                <div className="font-bold">Ranking Nacional</div>
                                <div className={`text-xs mt-1 ${rankingType === 'national' ? 'text-blue-200' : 'text-slate-500'}`}>
                                    Últimos 12 meses • Define Categorías
                                </div>
                                {rankingType === 'national' && (
                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-400"></div>
                                )}
                            </button>

                            <button
                                onClick={() => setRankingType('annual')}
                                className={`
                                    p-4 rounded-lg border text-left transition-all relative overflow-hidden group
                                    ${rankingType === 'annual'
                                        ? 'bg-yellow-600 border-yellow-500 text-white shadow-lg shadow-yellow-900/20'
                                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10'}
                                `}
                            >
                                <div className="font-bold flex items-center gap-2">
                                    Carrera Anual {new Date().getFullYear()}
                                </div>
                                <div className={`text-xs mt-1 ${rankingType === 'annual' ? 'text-yellow-200' : 'text-slate-500'}`}>
                                    Año en curso • Define Clasificados
                                </div>
                                {rankingType === 'annual' && (
                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-yellow-400"></div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Explainer Cards */}
                <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`
                        border rounded-xl p-5 flex items-start gap-4 shadow-lg transition-all duration-300
                        ${rankingType === 'national' ? 'bg-[#1A2333] border-blue-500/30 opacity-100' : 'bg-[#111620] border-white/5 opacity-60'}
                    `}>
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 mt-1">
                            <Info size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white mb-1">Ranking Nacional</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Clasificación oficial basada en los resultados de los últimos 12 meses.
                            </p>
                            <div className="flex gap-2 mt-3">
                                <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded font-bold">Cat A</span>
                                <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded font-bold">Cat B/C</span>
                            </div>
                        </div>
                    </div>

                    <div className={`
                        border rounded-xl p-5 flex items-start gap-4 shadow-lg transition-all duration-300
                        ${rankingType === 'annual' ? 'bg-[#1A2333] border-yellow-500/30 opacity-100' : 'bg-[#111620] border-white/5 opacity-60'}
                    `}>
                        <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500 mt-1">
                            <Trophy size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white mb-1">Carrera Anual</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Acumulación de puntos desde Enero. Mide el rendimiento de la temporada actual.
                            </p>
                            <div className="mt-3 text-xs text-yellow-400 font-medium">
                                ¡Define cupos a la Final de Chile!
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-[#111827] border border-white/10 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#0f1623] text-slate-400 uppercase text-xs font-bold border-b border-white/5">
                            <tr>
                                <th className="px-5 py-4 text-center w-12">#</th>
                                <th className="px-5 py-4 text-center w-12">Cat</th>
                                <th className="px-5 py-4">Jugador</th>
                                <th className="px-5 py-4">Club</th>

                                {/* Ranking Nacional */}
                                <th className={`
                                    px-5 py-4 text-center border-l border-white/5 transition-colors duration-300
                                    ${rankingType === 'national' ? 'bg-blue-500/10 text-blue-400' : 'bg-transparent text-slate-500 opacity-60'}
                                `}>
                                    <div className="flex flex-col">
                                        <span>Nacional</span>
                                        <span className="text-[10px] opacity-60 normal-case font-normal">Puntos</span>
                                    </div>
                                </th>

                                {/* Ranking Anual */}
                                <th className={`
                                    px-5 py-4 text-center border-l border-white/5 transition-colors duration-300
                                    ${rankingType === 'annual' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-transparent text-slate-500 opacity-60'}
                                `}>
                                    <div className="flex flex-col">
                                        <span>Anual</span>
                                        <span className="text-[10px] opacity-60 normal-case font-normal">Puntos</span>
                                    </div>
                                </th>

                                <th className="px-5 py-4 text-center border-l border-white/5 hidden lg:table-cell text-xs opacity-60">Torneos</th>
                                <th className="px-5 py-4 text-center border-l border-white/5 hidden lg:table-cell text-xs opacity-60">Carambolas</th>
                                <th className="px-5 py-4 text-center border-l border-white/5 hidden lg:table-cell text-xs opacity-60">Entradas</th>

                                <th className="px-5 py-4 text-center border-l border-white/5 hidden md:table-cell">HCP</th>
                                <th className="px-5 py-4 text-right hidden md:table-cell">Promedio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sortedRanking.map((p, index) => {
                                const avg = p.average || 0;
                                const hcp = calculateFechillarHandicap(avg);

                                // National
                                const pointsNational = p.ranking || 0;
                                const category = p.category || 'C';

                                // Annual
                                const pointsAnnual = p.ranking_annual || 0;

                                return (
                                    <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-5 py-4 text-center font-mono font-bold text-slate-500 group-hover:text-white transition-colors">
                                            {index + 1}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`
                                                font-bold px-2.5 py-1 rounded text-[11px]
                                                ${category === 'A' ? 'bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/20' :
                                                    category === 'B' ? 'bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20' :
                                                        'text-slate-500 ring-1 ring-slate-500/20'}
                                            `}>
                                                {category}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div
                                                onClick={() => handlePlayerClick(p)}
                                                className="font-bold text-white text-base cursor-pointer hover:text-blue-400 transition-colors inline-flex items-center gap-2"
                                            >
                                                {p.name}
                                                {loadingHistory && selectedPlayer?.id === p.id && <Loader2 size={14} className="animate-spin text-blue-500" />}
                                            </div>
                                            <div className="text-xs text-slate-500 md:hidden mt-0.5">
                                                {p.club_name || '-'} • HCP: {hcp}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-slate-400 text-sm hidden md:table-cell">
                                            {p.club_name || <span className="opacity-50">-</span>}
                                        </td>

                                        {/* National Stats */}
                                        <td className={`
                                            px-5 py-4 text-center font-bold border-l border-white/5 text-base transition-colors duration-300
                                            ${rankingType === 'national' ? 'bg-blue-500/5 text-blue-400 group-hover:bg-blue-500/10' : 'text-slate-600'}
                                        `}>
                                            {pointsNational}
                                        </td>

                                        {/* Annual Stats */}
                                        <td className={`
                                            px-5 py-4 text-center font-bold border-l border-white/5 text-base transition-colors duration-300
                                            ${rankingType === 'annual' ? 'bg-yellow-500/5 text-yellow-500 group-hover:bg-yellow-500/10' : 'text-slate-600'}
                                        `}>
                                            {pointsAnnual}
                                        </td>

                                        {/* New Stats Columns */}
                                        <td className="px-5 py-4 text-center border-l border-white/5 hidden lg:table-cell text-slate-400">
                                            {p.tournaments_played || 0}
                                        </td>
                                        <td className="px-5 py-4 text-center border-l border-white/5 hidden lg:table-cell text-slate-400">
                                            {p.total_carambolas || 0}
                                        </td>
                                        <td className="px-5 py-4 text-center border-l border-white/5 hidden lg:table-cell text-slate-400">
                                            {p.total_innings || 0}
                                        </td>

                                        <td className="px-5 py-4 text-center border-l border-white/5 hidden md:table-cell">
                                            <span className={`
                                                font-mono font-bold
                                                ${hcp >= 28 ? 'text-red-400' :
                                                    hcp >= 24 ? 'text-orange-400' :
                                                        'text-green-400'}
                                            `}>
                                                {p.handicap || hcp}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right font-mono text-slate-500 hidden md:table-cell">
                                            {p.average ? Number(p.average).toFixed(3) : avg.toFixed(3)}
                                        </td>
                                    </tr>
                                );
                            })}
                            {sortedRanking.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="text-center py-12 text-slate-500">
                                        No hay datos de ranking disponibles.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 text-center">
                <Link
                    href="/tournaments"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                >
                    Ver Calendario de Torneos <ArrowRight size={18} />
                </Link>
            </div>
            {/* Player History Modal */}
            {selectedPlayer && historyData && (
                <PlayerHistoryModal
                    player={selectedPlayer}
                    history={historyData}
                    onClose={() => {
                        setSelectedPlayer(null);
                        setHistoryData(null);
                    }}
                />
            )}
        </div>
    );
}
