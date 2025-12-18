'use client';

import { useState } from 'react';
import { createGlobalPlayer, updateGlobalPlayer } from '@/app/lib/tournament-actions';
import { Search, Plus, Pencil, User, Upload } from 'lucide-react';

export default function PlayerDirectory({ initialPlayers, clubs }) {
    const [players, setPlayers] = useState(initialPlayers);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [loading, setLoading] = useState(false);

    // Filtered Players
    const filteredPlayers = players.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.club_name && p.club_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    async function handleCreate(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.target);
            await createGlobalPlayer(formData);
            alert('Jugador creado correctamente');
            window.location.reload(); // Simple reload to refresh data
        } catch (error) {
            alert('Error creating player: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdate(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.target);
            await updateGlobalPlayer(editingPlayer.id, formData);
            alert('Jugador actualizado');
            window.location.reload();
        } catch (error) {
            alert('Error updating player: ' + error.message);
        } finally {
            setLoading(false);
        }
    }


    async function handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('¿Estás seguro de importar este archivo? Los jugadores existentes se actualizarán y los nuevos se crearán.')) {
            e.target.value = '';
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/admin/players/import', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                alert(`Importación completada.\nCreados: ${data.stats.created}\nActualizados: ${data.stats.updated}`);
                if (data.errors && data.errors.length > 0) {
                    alert('Errores:\n' + data.errors.join('\n'));
                }
                window.location.reload();
            } else {
                throw new Error(data.error || 'Error en importación');
            }
        } catch (error) {
            alert('Error al importar: ' + error.message);
        } finally {
            setLoading(false);
            e.target.value = ''; // Reset input
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        placeholder="Buscar por nombre o club..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9 h-10 w-full rounded-md border bg-background px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
                <div className="relative">
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleImport}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={loading}
                    />
                    <button
                        className="flex items-center gap-2 bg-accent text-accent-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-accent/80 transition-colors"
                        disabled={loading}
                    >
                        <Upload className="h-4 w-4" />
                        {loading ? 'Importando...' : 'Importar Excel'}
                    </button>
                </div>                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Jugador
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPlayers.map(p => (
                    <div key={p.id} className="relative group bg-card border rounded-lg p-4 flex flex-col items-center gap-3 hover:shadow-md transition-shadow">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => setEditingPlayer(p)}
                                className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-full"
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-muted shadow-sm">
                            {p.photo_url ? (
                                <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                                <User className="h-10 w-10 text-muted-foreground/50" />
                            )}
                        </div>

                        <div className="text-center w-full">
                            <h3 className="font-bold text-lg truncate w-full" title={p.name}>{p.name}</h3>
                            <p className="text-sm text-muted-foreground truncate w-full" title={p.club_name}>{p.club_name || 'Sin Club'}</p>
                        </div>
                    </div>
                ))}
            </div>

            {filteredPlayers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    No se encontraron jugadores.
                </div>
            )}

            {/* CREATE MODAL */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-background w-full max-w-md rounded-lg shadow-xl p-6 animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold mb-4">Registrar Nuevo Jugador</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-1">Nombre Completo</label>
                                <input name="name" required className="w-full border rounded-md px-3 py-2 bg-background" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1">Club / Equipo</label>
                                <select name="club_id" className="w-full border rounded-md px-3 py-2 bg-background">
                                    <option value="">-- Seleccionar Club --</option>
                                    {clubs.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1">Foto</label>
                                <input type="file" name="photo" accept="image/*" className="w-full text-sm" />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-sm">Cancelar</button>
                                <button type="submit" disabled={loading} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium">
                                    {loading ? 'Guardando...' : 'Crear Jugador'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {editingPlayer && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-background w-full max-w-md rounded-lg shadow-xl p-6 animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold mb-4">Editar Jugador</h2>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-1">Nombre Completo</label>
                                <input name="name" defaultValue={editingPlayer.name} required className="w-full border rounded-md px-3 py-2 bg-background" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1">Club / Equipo</label>
                                <select
                                    name="club_id"
                                    defaultValue={editingPlayer.club_id || ''}
                                    className="w-full border rounded-md px-3 py-2 bg-background"
                                >
                                    <option value="">-- Seleccionar Club --</option>
                                    {clubs.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1">Foto (Dejar vacío para mantener actual)</label>
                                <input type="file" name="photo" accept="image/*" className="w-full text-sm" />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setEditingPlayer(null)} className="px-4 py-2 text-sm">Cancelar</button>
                                <button type="submit" disabled={loading} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium">
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
