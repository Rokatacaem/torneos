'use client';

import { useState } from 'react';
import { createClub, updateClub, deleteClub } from '@/app/lib/tournament-actions';
import { useRouter } from 'next/navigation';

export default function ClubManager({ clubs }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [editingClub, setEditingClub] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form state (used for creation)
    const [newName, setNewName] = useState('');
    const [newShortName, setNewShortName] = useState('');
    const [newCountry, setNewCountry] = useState('');
    const [newCity, setNewCity] = useState('');

    async function handleCreate(e) {
        e.preventDefault();
        setLoading(true);
        console.log('Start submit...');
        try {
            const formData = new FormData(e.target);
            const res = await createClub(formData);
            console.log('Server response:', res);

            if (res && res.success) {
                setIsCreating(false);
                e.target.reset();
                router.refresh();
            } else {
                alert('Error al crear club: ' + (res?.message || 'Error desconocido'));
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión o inesperado: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdate(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.target);
            await updateClub(editingClub.id, formData);
            setEditingClub(null);
            router.refresh();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('¿Seguro que quieres eliminar este club?')) return;
        setLoading(true);
        try {
            await deleteClub(id);
            router.refresh();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                    Gestión de Clubes
                </h2>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-sm"
                >
                    + Nuevo Club
                </button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clubs.map(club => (
                    <div key={club.id} className="bg-[#0B1120] border border-white/5 rounded-xl p-6 relative group hover:border-blue-500/30 transition-all">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingClub(club)} className="p-2 hover:bg-white/10 rounded-full text-blue-400">
                                ✏️
                            </button>
                            <button onClick={() => handleDelete(club.id)} className="p-2 hover:bg-white/10 rounded-full text-red-400">
                                🗑️
                            </button>
                        </div>

                        <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 bg-[#131B2D] rounded-full flex items-center justify-center border border-white/10 overflow-hidden shadow-inner">
                                {club.logo_url ? (
                                    <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-slate-600">{club.short_name || club.name.substring(0, 2).toUpperCase()}</span>
                                )}
                            </div>
                        </div>

                        <div className="text-center">
                            <h3 className="font-bold text-lg text-white mb-1">{club.name}</h3>
                            <div className="flex justify-center gap-2 text-xs text-slate-400 font-medium tracking-wide uppercase">
                                {club.city && <span>{club.city}</span>}
                                {club.city && club.country && <span>•</span>}
                                {club.country && <span>{club.country}</span>}
                            </div>
                            {club.address && (
                                <div className="text-xs text-slate-500 mt-1 truncate px-4" title={club.address}>{club.address}</div>
                            )}

                            {/* Tables Summary */}
                            <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-4 gap-1 text-center">
                                <div title="Billar">
                                    <span className="block text-xs text-slate-500 font-bold mb-1">BIL</span>
                                    <span className="text-white font-bold">{club.tables_billar || 0}</span>
                                </div>
                                <div title="Pool">
                                    <span className="block text-xs text-slate-500 font-bold mb-1">POL</span>
                                    <span className="text-white font-bold">{club.tables_pool || 0}</span>
                                </div>
                                <div title="Bola 9">
                                    <span className="block text-xs text-slate-500 font-bold mb-1">B-9</span>
                                    <span className="text-white font-bold">{club.tables_bola9 || 0}</span>
                                </div>
                                <div title="Snooker">
                                    <span className="block text-xs text-slate-500 font-bold mb-1">SNK</span>
                                    <span className="text-white font-bold">{club.tables_snooker || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0B1120] w-full max-w-md rounded-2xl border border-white/10 p-6 animate-in fade-in zoom-in-95">
                        <h3 className="text-xl font-bold text-white mb-6">Nuevo Club</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nombre</label>
                                <input name="name" required className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" placeholder="Nombre completo del club" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Abreviatura</label>
                                <input name="short_name" className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" placeholder="Ej: CBC" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ciudad</label>
                                    <input name="city" className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">País</label>
                                    <input name="country" className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Dirección</label>
                                <input name="address" className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" placeholder="Calle, Número, Comuna, etc." />
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                                    🎱 Cantidad de Mesas
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">Billar</label>
                                        <input type="number" name="tables_billar" min="0" placeholder="0" className="w-full bg-[#0B1120] border border-white/10 rounded-lg h-9 px-3 text-white text-sm focus:border-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">Pool</label>
                                        <input type="number" name="tables_pool" min="0" placeholder="0" className="w-full bg-[#0B1120] border border-white/10 rounded-lg h-9 px-3 text-white text-sm focus:border-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">Bola 9</label>
                                        <input type="number" name="tables_bola9" min="0" placeholder="0" className="w-full bg-[#0B1120] border border-white/10 rounded-lg h-9 px-3 text-white text-sm focus:border-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">Snooker</label>
                                        <input type="number" name="tables_snooker" min="0" placeholder="0" className="w-full bg-[#0B1120] border border-white/10 rounded-lg h-9 px-3 text-white text-sm focus:border-blue-500 outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Logo</label>
                                <input type="file" name="logo" accept="image/*" className="w-full text-slate-400 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30" />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-2 text-slate-400 hover:text-white font-medium">Cancelar</button>
                                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white rounded-lg font-bold py-2 shadow-lg shadow-blue-900/20 hover:bg-blue-500 disabled:opacity-50">Crear Club</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingClub && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0B1120] w-full max-w-md rounded-2xl border border-white/10 p-6 animate-in fade-in zoom-in-95">
                        <h3 className="text-xl font-bold text-white mb-6">Editar Club</h3>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nombre</label>
                                <input name="name" defaultValue={editingClub.name} required className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Abreviatura</label>
                                <input name="short_name" defaultValue={editingClub.short_name} className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ciudad</label>
                                    <input name="city" defaultValue={editingClub.city} className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">País</label>
                                    <input name="country" defaultValue={editingClub.country} className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Dirección</label>
                                <input name="address" defaultValue={editingClub.address} className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" />
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                                    🎱 Cantidad de Mesas
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">Billar</label>
                                        <input type="number" name="tables_billar" defaultValue={editingClub.tables_billar || 0} min="0" className="w-full bg-[#0B1120] border border-white/10 rounded-lg h-9 px-3 text-white text-sm focus:border-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">Pool</label>
                                        <input type="number" name="tables_pool" defaultValue={editingClub.tables_pool || 0} min="0" className="w-full bg-[#0B1120] border border-white/10 rounded-lg h-9 px-3 text-white text-sm focus:border-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">Bola 9</label>
                                        <input type="number" name="tables_bola9" defaultValue={editingClub.tables_bola9 || 0} min="0" className="w-full bg-[#0B1120] border border-white/10 rounded-lg h-9 px-3 text-white text-sm focus:border-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">Snooker</label>
                                        <input type="number" name="tables_snooker" defaultValue={editingClub.tables_snooker || 0} min="0" className="w-full bg-[#0B1120] border border-white/10 rounded-lg h-9 px-3 text-white text-sm focus:border-blue-500 outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Logo</label>
                                <input type="file" name="logo" accept="image/*" className="w-full text-slate-400 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30" />
                                <p className="text-xs text-slate-600 mt-2">Deja vacío para mantener el logo actual.</p>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setEditingClub(null)} className="flex-1 py-2 text-slate-400 hover:text-white font-medium">Cancelar</button>
                                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white rounded-lg font-bold py-2 shadow-lg shadow-blue-900/20 hover:bg-blue-500 disabled:opacity-50">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
