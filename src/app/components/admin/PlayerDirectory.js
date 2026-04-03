'use client';

import { useState } from 'react';
import { createGlobalPlayer, updateGlobalPlayer, deleteGlobalPlayer, deleteGlobalPlayers, forceDeleteGlobalPlayer } from '@/app/lib/tournament-actions';
import { Search, Plus, Pencil, User, Upload, Trash2, CheckSquare, Square, Download, AlertTriangle } from 'lucide-react';
import { upload } from '@vercel/blob/client';

export default function PlayerDirectory({ initialPlayers, clubs, role }) {
    const [players, setPlayers] = useState(initialPlayers);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]); // Bulk Selection State

    // Check role permissions
    const allowedRoles = ['admin', 'superadmin', 'SUPERADMIN', 'creator', 'Creator'];
    const isAdmin = allowedRoles.includes(role);
    const isSuperAdmin = ['SUPERADMIN', 'superadmin'].includes(role);
    const canEdit = isAdmin;
    const canImport = isAdmin;
    const canDelete = isAdmin;
    const canCreate = true;
    const [syncMode, setSyncMode] = useState(false);

    // Filtered Players
    const filteredPlayers = players.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.club_name && p.club_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Duplicate Detection: group by normalized name, mark those appearing > 1
    const nameCounts = {};
    players.forEach(p => {
        const key = p.name.toLowerCase().trim();
        nameCounts[key] = (nameCounts[key] || 0) + 1;
    });
    const duplicateNames = new Set(Object.keys(nameCounts).filter(k => nameCounts[k] > 1));
    const duplicateCount = players.filter(p => duplicateNames.has(p.name.toLowerCase().trim())).length;

    async function handleCreate(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.target);
            const photoFile = formData.get('photo');

            // Client-side Upload
            if (photoFile && photoFile.size > 0) {
                const blob = await upload(photoFile.name, photoFile, {
                    access: 'public',
                    handleUploadUrl: '/api/upload',
                });
                formData.set('photo_url', blob.url);
                formData.delete('photo'); // Remove raw file
            }

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
            const photoFile = formData.get('photo');

            // Client-side Upload
            if (photoFile && photoFile.size > 0) {
                const blob = await upload(photoFile.name, photoFile, {
                    access: 'public',
                    handleUploadUrl: '/api/upload',
                });
                formData.set('photo_url', blob.url);
                formData.delete('photo'); // Remove raw file
            }

            await updateGlobalPlayer(editingPlayer.id, formData);
            alert('Jugador actualizado');
            window.location.reload();
        } catch (error) {
            alert('Error updating player: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(player) {
        if (!confirm(`¿Estás seguro de eliminar a ${player.name}? Esta acción no se puede deshacer.`)) return;

        setLoading(true);
        try {
            const res = await deleteGlobalPlayer(player.id);
            if (!res) throw new Error('Sin respuesta del servidor');
            if (res.error) {
                // If blocked by FK, offer force delete
                setLoading(false);
                if (confirm(`⚠️ ${player.name} está vinculado a torneos.\n\n¿Deseas FORZAR la eliminación?\n(Se borrará también su historial de partidos en esos torneos)`)) {
                    await handleForceDelete(player);
                }
                return;
            }
            setPlayers(prev => prev.filter(p => p.id !== player.id));
            alert(`✅ ${player.name} eliminado correctamente.`);
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    }


    async function handleForceDelete(player) {
        if (!confirm(`⚠️ FORZAR ELIMINACIÓN de ${player.name}\n\nEsto borrará también su historial de partidos en torneos.\n¿Continuar?`)) return;
        setLoading(true);
        try {
            const res = await forceDeleteGlobalPlayer(player.id);
            if (!res) throw new Error('Sin respuesta del servidor');
            if (res.error) throw new Error(res.error);
            setPlayers(prev => prev.filter(p => p.id !== player.id));
            alert(`✅ ${player.name} eliminado forzosamente.`);
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    // Bulk Actions
    const handleSelectAll = () => {
        if (selectedIds.length === filteredPlayers.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredPlayers.map(p => p.id));
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        const count = selectedIds.length;
        if (count === 0) return;
        if (!confirm(`¿Estás seguro de eliminar ${count} jugadores seleccionados? Esta acción no se puede deshacer.`)) return;

        setLoading(true);
        try {
            // Convert to numbers in case IDs come as strings
            const numericIds = selectedIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
            const res = await deleteGlobalPlayers(numericIds);
            if (!res) throw new Error('Sin respuesta del servidor');
            if (res.error) throw new Error(res.error);
            // Optimistic remove from local state
            setPlayers(prev => prev.filter(p => !selectedIds.includes(p.id)));
            setSelectedIds([]);
            alert(`✅ ${res.count ?? count} jugadores eliminados correctamente.`);
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    async function handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const syncWarning = syncMode
            ? '\n\n⚠️ MODO SINCRONIZACIÓN ACTIVO:\nLos jugadores que NO estén en el Excel serán ELIMINADOS (incluyendo su historial de torneos).'
            : '';

        if (!confirm(`¿Importar "${file.name}"?\nJugadores existentes se actualizarán, nuevos se crearán.${syncWarning}`)) {
            e.target.value = '';
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        const url = syncMode
            ? '/api/admin/players/import?mode=sync'
            : '/api/admin/players/import';

        try {
            const res = await fetch(url, { method: 'POST', body: formData });
            const data = await res.json();

            if (res.ok) {
                let msg = `✅ Importación completada:\n  • Creados: ${data.stats.created}\n  • Actualizados: ${data.stats.updated}`;
                if (syncMode && data.stats.deleted !== undefined) {
                    msg += `\n  • Eliminados: ${data.stats.deleted}`;
                }
                alert(msg);
                if (data.errors && data.errors.length > 0) {
                    alert('⚠️ Advertencias:\n' + data.errors.slice(0, 10).join('\n'));
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

            <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
                {/* Left: Selection controls */}
                {canDelete && filteredPlayers.length > 0 && (
                    <div className="flex items-center gap-3 bg-muted px-3 py-2 rounded-md">
                        <button
                            onClick={handleSelectAll}
                            className="flex items-center gap-2 text-sm font-medium hover:text-primary"
                        >
                            {selectedIds.length === filteredPlayers.length ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                            )}
                            {selectedIds.length > 0 ? `${selectedIds.length} seleccionados` : 'Seleccionar Todo'}
                        </button>
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                disabled={loading}
                                className="flex items-center gap-1 text-red-500 hover:text-red-400 text-sm font-medium border-l border-zinc-500 pl-3"
                            >
                                <Trash2 className="h-4 w-4" />
                                Eliminar ({selectedIds.length})
                            </button>
                        )}
                    </div>
                )}

                {/* Right: count + actions */}
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                    <span className="text-xs text-muted-foreground">
                        {filteredPlayers.length} jugadores
                        {duplicateNames.size > 0 && (
                            <span className="ml-2 text-orange-400 font-semibold">
                                · {duplicateCount} posibles duplicados
                            </span>
                        )}
                    </span>

                    {/* Sync mode toggle - SUPERADMIN only */}
                    {canImport && isSuperAdmin && (
                        <label className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md border cursor-pointer transition-colors select-none
                            ${syncMode ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                            <input
                                type="checkbox"
                                checked={syncMode}
                                onChange={e => setSyncMode(e.target.checked)}
                                className="w-3 h-3 accent-red-500"
                            />
                            <AlertTriangle className={`h-3 w-3 ${syncMode ? 'text-red-400' : ''}`} />
                            Modo Sincronización
                        </label>
                    )}

                    {/* Export button */}
                    {canImport && (
                        <a
                            href="/api/admin/players/export"
                            className="flex items-center gap-2 bg-accent text-accent-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-accent/80 transition-colors"
                            title="Exportar listado completo de jugadores a Excel"
                        >
                            <Download className="h-4 w-4" />
                            Exportar
                        </a>
                    )}

                    {/* Import button */}
                    {canImport && (
                        <div className="relative">
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleImport}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={loading}
                            />
                            <button
                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                                    ${syncMode
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'bg-accent text-accent-foreground hover:bg-accent/80'}`}
                                disabled={loading}
                            >
                                <Upload className="h-4 w-4" />
                                {loading ? 'Procesando...' : syncMode ? 'Importar + Sincronizar' : 'Importar Excel'}
                            </button>
                        </div>
                    )}

                    {canCreate && (
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Nuevo Jugador
                        </button>
                    )}
                </div>
            </div>


            {/* LIST VIEW */}
            <div className="border rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[40px_40px_1fr_1fr_90px_110px] gap-2 px-3 py-2 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div></div>
                    <div></div>
                    <div>Jugador</div>
                    <div>Club</div>
                    <div className="text-right">Promedio</div>
                    <div className="text-right">Acciones</div>
                </div>

                <div className="divide-y max-h-[70vh] overflow-y-auto">
                    {filteredPlayers.map(p => {
                        const isDuplicate = duplicateNames.has(p.name.toLowerCase().trim());
                        const isSelected = selectedIds.includes(p.id);
                        return (
                            <div
                                key={p.id}
                                className={[
                                    'grid grid-cols-[40px_40px_1fr_1fr_90px_110px] gap-2 px-3 py-2.5 items-center hover:bg-muted/30 transition-colors',
                                    isSelected ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : '',
                                    isDuplicate ? 'border-l-4 border-orange-500' : ''
                                ].join(' ')}
                            >
                                {/* Checkbox */}
                                {canDelete ? (
                                    <button
                                        onClick={() => toggleSelection(p.id)}
                                        className="flex items-center justify-center"
                                    >
                                        {isSelected ? (
                                            <CheckSquare className="h-4 w-4 text-primary" />
                                        ) : (
                                            <Square className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                        )}
                                    </button>
                                ) : <div />}

                                {/* Avatar */}
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                                    {p.photo_url ? (
                                        <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="h-4 w-4 text-muted-foreground/50" />
                                    )}
                                </div>

                                {/* Name */}
                                <div className="min-w-0 flex items-center gap-2">
                                    <span className="font-medium text-sm truncate">{p.name}</span>
                                    {isDuplicate && (
                                        <span className="text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                            DUPLICADO
                                        </span>
                                    )}
                                </div>

                                {/* Club */}
                                <div className="text-sm text-muted-foreground truncate">
                                    {p.club_name || <span className="italic opacity-50">Sin Club</span>}
                                </div>

                                {/* Average */}
                                <div className="text-sm text-right tabular-nums">
                                    {p.average ? parseFloat(p.average).toFixed(3) : '—'}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-1">
                                    {canEdit && (
                                        <button
                                            onClick={() => setEditingPlayer(p)}
                                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                            title="Editar"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDelete(p)}
                                            disabled={loading}
                                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                            title="Eliminar (solo si no participa en torneos)"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            onClick={() => handleForceDelete(p)}
                                            disabled={loading}
                                            className="p-1.5 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 rounded transition-colors"
                                            title="⚠️ Forzar eliminación (borra historial de torneos)"
                                        >
                                            <span className="text-[10px] font-bold leading-none">⚠️</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
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
