'use client';

import { useState, useEffect } from 'react';
import { Shield, UserPlus, X, Loader2, Info } from 'lucide-react';
import { getAvailableReferees, getTournamentAssignments, assignReferee, removeReferee } from '@/app/lib/referee-actions';
import { useRouter } from 'next/navigation';

export default function RefereeAssignmentManager({ tournamentId }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [availableReferees, setAvailableReferees] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [selectedRefereeId, setSelectedRefereeId] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [available, current] = await Promise.all([
                getAvailableReferees(),
                getTournamentAssignments(tournamentId)
            ]);
            setAvailableReferees(available);
            setAssignments(current);
        } catch (error) {
            console.error('Error fetching referees:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [tournamentId]);

    const handleAssign = async () => {
        if (!selectedRefereeId) return;
        setActionLoading(true);
        try {
            const res = await assignReferee(tournamentId, selectedRefereeId);
            if (res.success) {
                await fetchData();
                setSelectedRefereeId('');
            } else {
                alert(res.error || 'Error al asignar juez');
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemove = async (userId) => {
        if (!confirm('¿Quitar designación a este juez?')) return;
        setActionLoading(true);
        try {
            const res = await removeReferee(tournamentId, userId);
            if (res.success) {
                await fetchData();
            }
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="p-4 flex items-center justify-center"><Loader2 className="animate-spin text-slate-500" /></div>;

    return (
        <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm">
                    <Shield size={18} className="text-orange-500" />
                    Jueces Designados
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 italic">
                    <Info size={12} />
                    Solo estos jueces verán el torneo en su panel
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Assignment Form */}
                <div className="flex gap-2">
                    <select
                        value={selectedRefereeId}
                        onChange={(e) => setSelectedRefereeId(e.target.value)}
                        className="flex-1 bg-slate-950 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none"
                    >
                        <option value="">-- Seleccionar Juez para Designar --</option>
                        {availableReferees
                            .filter(ref => !assignments.some(a => a.id === ref.id))
                            .map(ref => (
                                <option key={ref.id} value={ref.id}>
                                    {ref.username} ({ref.role})
                                </option>
                            ))
                        }
                    </select>
                    <button
                        onClick={handleAssign}
                        disabled={!selectedRefereeId || actionLoading}
                        className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:bg-slate-800 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2 text-sm font-bold shadow-lg shadow-orange-950/20"
                    >
                        {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                        Designar
                    </button>
                </div>

                {/* Assignments List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {assignments.length === 0 ? (
                        <div className="col-span-full py-6 text-center text-slate-500 text-xs border border-dashed border-white/5 rounded-lg">
                            No hay jueces designados. Todos los jueces tienen acceso denegado.
                        </div>
                    ) : (
                        assignments.map(ass => (
                            <div key={ass.id} className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-white/5 group hover:border-orange-500/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                                        {ass.username.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white leading-none mb-1">{ass.username}</div>
                                        <div className="text-[10px] text-orange-500/70 font-mono uppercase tracking-tighter">
                                            {ass.role} • {new Date(ass.assigned_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemove(ass.id)}
                                    className="p-1 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
