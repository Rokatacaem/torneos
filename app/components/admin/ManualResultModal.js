'use client';

import { useState } from 'react';
import { updateMatchResult } from '@/app/lib/match-actions';

export default function ManualResultModal({ match, onClose }) {
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
        const res = await updateMatchResult(match.id, formData);
        setLoading(false);

        if (res.success) {
            onClose(true); // true = refreshed
        } else {
            alert(res.message);
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0B1120] w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Ingreso de Resultado</h3>
                    <button onClick={() => onClose(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Players Header */}
                    <div className="flex justify-between text-sm font-bold text-slate-300 mb-2 px-2">
                        <div className="w-1/2 text-center border-r border-white/10 pr-2 overflow-hidden text-ellipsis whitespace-nowrap">
                            {match.player1_name || 'Jugador 1'}
                        </div>
                        <div className="w-1/2 text-center pl-2 overflow-hidden text-ellipsis whitespace-nowrap">
                            {match.player2_name || 'Jugador 2'}
                        </div>
                    </div>

                    {/* Scores */}
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className="block text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 text-center">Puntaje</label>
                            <input
                                name="scoreP1"
                                type="number"
                                min="0"
                                required
                                className="w-full bg-[#131B2D] border border-white/10 rounded-xl h-16 text-center text-3xl font-bold text-white focus:border-blue-500 outline-none"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 text-center">Puntaje</label>
                            <input
                                name="scoreP2"
                                type="number"
                                min="0"
                                required
                                className="w-full bg-[#131B2D] border border-white/10 rounded-xl h-16 text-center text-3xl font-bold text-white focus:border-blue-500 outline-none"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-white/5 rounded-xl p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">Serie Mayor</label>
                                <input name="highRunP1" type="number" min="0" className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white text-center focus:border-blue-500 outline-none" placeholder="0" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">Serie Mayor</label>
                                <input name="highRunP2" type="number" min="0" className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white text-center focus:border-blue-500 outline-none" placeholder="0" />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-white/10">
                            <label className="block text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2 text-center">Total Entradas</label>
                            <input
                                name="innings"
                                type="number"
                                min="1"
                                required
                                className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-12 text-center text-xl font-bold text-white focus:border-yellow-500 outline-none"
                                placeholder="1"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => onClose(false)} className="flex-1 py-3 text-slate-400 hover:text-white font-medium">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-1 bg-green-600 text-white rounded-xl font-bold py-3 hover:bg-green-500 shadow-lg shadow-green-900/20">
                            {loading ? 'Guardando...' : 'Confirmar Resultado'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
