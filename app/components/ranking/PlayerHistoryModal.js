'use client';

import { useState } from 'react';
import { X, Trophy, Swords, Calendar, Eye } from 'lucide-react';

export default function PlayerHistoryModal({ player, history, onClose }) {
    const [activeTab, setActiveTab] = useState('matches'); // 'matches' | 'tournaments'

    if (!player || !history) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#111827] w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-[#1A2333] flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center border-2 border-white/10 shadow-lg text-2xl font-bold text-white overflow-hidden">
                            {player.photo_url ? (
                                <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                            ) : (
                                <span>{player.name.charAt(0)}</span>
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{player.name}</h2>
                            <p className="text-blue-400 font-medium">{player.club_name || 'Sin Club'}</p>
                            <div className="flex gap-3 mt-2 text-xs font-bold uppercase tracking-wider">
                                <span className="bg-white/5 text-slate-400 px-2 py-1 rounded border border-white/5">
                                    Cat {player.category || 'C'}
                                </span>
                                <span className={`px-2 py-1 rounded border ${player.handicap >= 28 ? 'bg-red-500/10 text-red-500 border-red-500/20' : player.handicap >= 20 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                                    HCP {player.handicap || 0}
                                </span>
                                <span className="bg-white/5 text-slate-400 px-2 py-1 rounded border border-white/5">
                                    AVG {player.average ? Number(player.average).toFixed(3) : '0.000'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 bg-[#0f1623]">
                    <button
                        onClick={() => setActiveTab('matches')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center justify-center gap-2
                            ${activeTab === 'matches' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'}
                        `}
                    >
                        <Swords size={16} />
                        Historial de Partidos
                    </button>
                    <button
                        onClick={() => setActiveTab('tournaments')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center justify-center gap-2
                            ${activeTab === 'tournaments' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'}
                        `}
                    >
                        <Trophy size={16} />
                        Torneos Jugados
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {activeTab === 'tournaments' && (
                        <div className="p-6">
                            <table className="w-full text-left text-sm">
                                <thead className="text-slate-500 font-bold uppercase text-xs bg-white/5">
                                    <tr>
                                        <th className="px-4 py-3 rounded-l-lg">Fecha</th>
                                        <th className="px-4 py-3">Torneo</th>
                                        <th className="px-4 py-3 text-center">Rk Ini</th>
                                        <th className="px-4 py-3 text-center">Posición</th>
                                        <th className="px-4 py-3 text-right">Promedio</th>
                                        <th className="px-4 py-3 text-center rounded-r-lg">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {history.tournaments.map((t) => (
                                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 text-slate-400">
                                                {new Date(t.start_date).toLocaleDateString('es-CL')}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-white">
                                                {t.name}
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-400">
                                                {t.initial_ranking || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-yellow-500">
                                                {t.final_position ? `#${t.final_position}` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-blue-300">
                                                {t.average ? Number(t.average).toFixed(3) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase
                                                    ${t.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-slate-700 text-slate-400'}
                                                `}>
                                                    {t.status === 'active' ? 'Activo' : 'Final'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {history.tournaments.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="text-center py-8 text-slate-500">
                                                No hay registros de torneos.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'matches' && (
                        <div>
                            {history.matches.map((m) => {
                                const isP1 = m.player1_id === player.id;
                                const myScore = isP1 ? m.score_p1 : m.score_p2;
                                const oppScore = isP1 ? m.score_p2 : m.score_p1;
                                const opponentName = isP1 ? m.player2_name : m.player1_name;
                                const isWinner = m.winner_id === player.id;
                                const avg = m.innings > 0 ? (myScore / m.innings).toFixed(3) : '0.000';

                                return (
                                    <div key={m.id} className="border-b border-white/5 p-4 hover:bg-white/5 transition-colors flex flex-col sm:flex-row items-center gap-4">
                                        <div className="flex-1 w-full sm:w-auto">
                                            <div className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-2">
                                                <Calendar size={12} />
                                                {new Date(m.start_date).toLocaleDateString('es-CL')} • {m.tournament_name}
                                            </div>
                                            <div className="flex items-center justify-between bg-[#0B1120] p-3 rounded-lg border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-sm font-bold ${isWinner ? 'text-green-400' : 'text-slate-400'}`}>
                                                        {isWinner ? 'VICTORIA' : 'DERROTA'}
                                                    </span>
                                                    <span className="text-slate-600">vs</span>
                                                    <span className="text-white font-medium">{opponentName || 'Desconocido'}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <span className="block text-2xl font-bold font-mono text-white leading-none">
                                                            {myScore} <span className="text-slate-600 text-lg">-</span> {oppScore}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase">
                                                            en {m.innings} ent. ({avg})
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-center w-full sm:w-24 shrink-0">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Fase</div>
                                            <div className="text-xs bg-white/5 text-slate-300 px-2 py-1 rounded border border-white/5">
                                                {m.instance_stage || m.round_label || `R${m.round_number}`}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {history.matches.length === 0 && (
                                <div className="text-center py-12 text-slate-500">
                                    No hay historial de partidos registrados.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
