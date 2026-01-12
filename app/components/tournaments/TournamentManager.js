'use client';

import { useState } from 'react';
import { registerPlayer, generateGroups, updatePlayer, searchPlayers, generatePlayoffs, previewGroups, removePlayer, removePlayers, disqualifyPlayer, purgeTournament, generateNextRound } from '@/app/lib/tournament-actions';
import ManualResultModal from '@/app/components/admin/ManualResultModal';
import FinalizeTournamentButton from './FinalizeTournamentButton';
import { useRouter } from 'next/navigation';

export default function TournamentManager({ tournament, players, matches, clubs = [] }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('players');
    const [loading, setLoading] = useState(false);

    // Estados para formulario de jugador
    const [playerName, setPlayerName] = useState('');
    const [teamName, setTeamName] = useState('');
    const [clubId, setClubId] = useState('');
    const [handicap, setHandicap] = useState(0);
    const [ranking, setRanking] = useState(0);
    const [identification, setIdentification] = useState('');
    const [average, setAverage] = useState('0.000');

    // Search State
    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Preview State
    const [previewData, setPreviewData] = useState(null);

    // Selection State
    const [selectedPlayers, setSelectedPlayers] = useState(new Set());

    const toggleSelectAll = () => {
        if (selectedPlayers.size === players.length) {
            setSelectedPlayers(new Set());
        } else {
            setSelectedPlayers(new Set(players.map(p => p.id)));
        }
    };

    const toggleSelectPlayer = (id) => {
        const newSet = new Set(selectedPlayers);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedPlayers(newSet);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`¿Estás seguro de ELIMINAR ${selectedPlayers.size} jugadores seleccionados?`)) return;
        setLoading(true);
        try {
            await removePlayers(tournament.id, Array.from(selectedPlayers));
            setSelectedPlayers(new Set());
            alert('Jugadores eliminados');
            router.refresh();
        } catch (e) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (term) => {
        setPlayerName(term);
        if (term.length > 1) {
            const results = await searchPlayers(term);
            setSearchResults(results);
            setShowSuggestions(true);
        } else {
            setSearchResults([]);
            setShowSuggestions(false);
        }
    };

    const selectPlayer = (p) => {
        setPlayerName(p.name);
        setClubId(p.club_id || '');
        setTeamName(p.club_name || ''); // Fallback
        setIdentification(p.identification || '');
        setAverage(p.average ? p.average.toString() : '0.000');
        setShowSuggestions(false);
    };

    // Estado para modal de resultados
    const [selectedMatch, setSelectedMatch] = useState(null);
    // Estado para modal de edición de jugador
    const [editingPlayer, setEditingPlayer] = useState(null);

    async function handleUpdatePlayer(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('player_name', editingPlayer.player_name);
            formData.append('team_name', editingPlayer.team_name || '');
            formData.append('handicap', editingPlayer.handicap || 0);
            formData.append('ranking', editingPlayer.ranking || 0);
            if (editingPlayer.club_id) formData.append('club_id', editingPlayer.club_id);

            // Get file from input
            const fileInput = e.target.elements.edit_photo;
            if (fileInput && fileInput.files[0]) {
                formData.append('photo', fileInput.files[0]);
            }

            await updatePlayer(editingPlayer.id, formData);

            setEditingPlayer(null);
            alert('Jugador actualizado');
            router.refresh();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddPlayer(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('player_name', playerName);
            formData.append('club_id', clubId);
            if (identification) formData.append('identification', identification);
            formData.append('team_name', teamName); // Fallback
            formData.append('handicap', handicap);
            formData.append('ranking', ranking);
            formData.append('average', average);

            // Get file from input
            const fileInput = document.getElementById('player_photo');
            if (fileInput && fileInput.files[0]) {
                formData.append('photo', fileInput.files[0]);
            }

            const res = await registerPlayer(tournament.id, formData);
            if (res && res.warning) alert(res.warning);

            setPlayerName('');
            setTeamName('');
            setClubId('');
            setIdentification('');
            setHandicap(0);
            setRanking(0);
            setAverage('0.000');
            setAverage('0.000');
            if (fileInput) fileInput.value = ''; // Reset file input

            // alert('Jugador registrado');
            router.refresh();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDeletePlayer(p) {
        if (!confirm(`¿Eliminar a ${p.player_name}? Si hay lista de espera, el siguiente entrará automáticamente.`)) return;
        setLoading(true);
        try {
            await removePlayer(tournament.id, p.id);
            alert('Jugador eliminado');
            router.refresh();
        } catch (e) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDisqualify(p) {
        if (!confirm(`¿EXPULSAR a ${p.player_name}? \n\n- Se marcará como DESCALIFICADO.\n- Se aplicará W.O. a todos sus partidos pendientes.\n- Esta acción es irreversible.`)) return;
        setLoading(true);
        try {
            const res = await disqualifyPlayer(tournament.id, p.id);
            if (res.success) {
                alert(res.message);
                router.refresh();
            } else {
                alert(res.message);
            }
        } catch (e) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handlePreview() {
        setLoading(true);
        try {
            const groups = await previewGroups(tournament.id);
            setPreviewData(groups);
        } catch (err) {
            alert('Error generando vista previa: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleImportRanking(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('¿Importar jugadores desde este archivo? Se intentará vincular por ID o Nombre. Los cupos se respetarán (lista de espera).')) {
            e.target.value = '';
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`/api/admin/tournaments/${tournament.id}/import`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                alert(`Importación completada.\nRegistrados: ${data.stats.registered}\nLista de Espera: ${data.stats.waitlisted}\nOmitidos (Ya inscritos): ${data.stats.skipped}`);
                if (data.stats.errors && data.stats.errors.length > 0) {
                    alert('Errores:\n' + data.stats.errors.join('\n'));
                }
                router.refresh();
            } else {
                throw new Error(data.error || 'Error en importación');
            }
        } catch (error) {
            alert('Error al importar: ' + error.message);
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    }

    async function handleGenerateConfirm() {
        setLoading(true);
        try {
            const res = await generateGroups(tournament.id);
            if (!res.success) {
                throw new Error(res.message);
            }
            setPreviewData(null); // Close modal
            alert('Grupos y Fixture generados con éxito');
            router.refresh();
            setActiveTab('matches');
        } catch (err) {
            alert('Error generando grupos: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-4 border-b">
                <button
                    onClick={() => setActiveTab('players')}
                    className={`px-4 py-2 border-b-2 font-medium ${activeTab === 'players' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                >
                    Jugadores ({players.length}/{tournament.max_players || '∞'})
                </button>
                <button
                    onClick={() => setActiveTab('matches')}
                    className={`px-4 py-2 border-b-2 font-medium ${activeTab === 'matches' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                >
                    Partidas ({matches.length})
                </button>
                <div className="ml-auto flex items-center">
                    <FinalizeTournamentButton tournament={tournament} />
                </div>
            </div>

            {activeTab === 'players' && (
                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <div className="flex justify-between items-center mb-4 gap-2">
                            <h3 className="font-semibold">Lista de Inscritos</h3>
                            <div className="flex gap-2 items-center">
                                {selectedPlayers.size > 0 && (
                                    <button
                                        onClick={handleBulkDelete}
                                        disabled={loading}
                                        className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs animate-in fade-in zoom-in duration-200"
                                    >
                                        Eliminar ({selectedPlayers.size})
                                    </button>
                                )}
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={handleImportRanking}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={loading}
                                        title="Importar Excel exportado del Ranking"
                                    />
                                    <button
                                        className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded flex items-center gap-1 shadow-sm transition-colors"
                                        disabled={loading}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                        Importar
                                    </button>
                                </div>
                                {matches.length === 0 && players.length >= 2 && (
                                    <button
                                        onClick={handlePreview}
                                        disabled={loading}
                                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded flex items-center gap-1 shadow-sm transition-colors"
                                        title="Ver proyección de grupos antes de confirmar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" /></svg>
                                        Vista Previa
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2 px-3 text-xs text-muted-foreground">
                            <input
                                type="checkbox"
                                checked={players.length > 0 && selectedPlayers.size === players.length}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-primary focus:ring-offset-0 focus:ring-1 focus:ring-primary"
                            />
                            <span>Seleccionar Todos</span>
                        </div>
                        <div className="border rounded-md divide-y max-h-[600px] overflow-y-auto">
                            {players.map(p => (
                                <div key={p.id} className="p-3 flex justify-between items-center group hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedPlayers.has(p.id)}
                                            onChange={() => toggleSelectPlayer(p.id)}
                                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-primary focus:ring-offset-0 focus:ring-1 focus:ring-primary"
                                        />
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300">
                                            {p.photo_url ? (
                                                <img src={p.photo_url} alt={p.player_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-slate-500 font-bold text-xs">{p.player_name.substring(0, 2).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-medium">{p.player_name}</div>
                                            {(p.team_name || p.status) && (
                                                <div className="text-xs text-muted-foreground">
                                                    {p.team_name}
                                                    {p.status === 'waitlist' && <span className="text-orange-500 font-bold ml-1">(Espera)</span>}
                                                    {p.status === 'disqualified' && <span className="text-red-500 font-bold ml-1">(DESCALIFICADO)</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-xs text-slate-400 bg-secondary/50 px-2 py-1 rounded">Avg: {p.average || '-'}</div>
                                        <div className="text-sm bg-secondary px-2 py-1 rounded">HCP: {p.handicap}</div>
                                        <button
                                            onClick={() => {
                                                setEditingPlayer(p);
                                                setPlayerName(p.player_name);
                                                setTeamName(p.team_name || ''); // Try to match by name if not ID? Ideally we need club_id in p
                                                // We need club_id in p to edit correctly if using select.
                                                // Assuming p comes from tournament_players which doesn't have club_id directly unless updated query.
                                                setHandicap(p.handicap);
                                                setRanking(p.ranking || '');
                                                setAverage(p.average || '');
                                                // ID?
                                            }}
                                            className="text-slate-400 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Editar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDisqualify(p)}
                                            className="text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Expulsar / Descalificar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeletePlayer(p)}
                                            className="text-slate-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Eliminar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                        </button>
                                    </div>
                                </div>

                            ))}
                            {players.length === 0 && <div className="p-4 text-center text-muted-foreground">Sin jugadores</div>}
                        </div>
                    </div>

                    <div className="bg-muted/30 p-6 rounded-lg h-fit">
                        <h3 className="font-semibold mb-4">Registrar Jugador</h3>
                        <form onSubmit={handleAddPlayer} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-card p-4 rounded-lg border border-white/5">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Nombre Jugador</label>
                                    <div className="relative">
                                        <input
                                            name="player_name"
                                            value={playerName}
                                            onChange={e => handleSearch(e.target.value)}
                                            className="w-full h-10 rounded-md border border-white/10 bg-[#0B1120] px-3 text-white text-sm"
                                            placeholder="Nombre..."
                                            required
                                            autoComplete="off"
                                        />
                                        {showSuggestions && searchResults.length > 0 && (
                                            <ul className="absolute z-10 w-full bg-slate-800 border border-white/10 rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto">
                                                {searchResults.map(p => (
                                                    <li
                                                        key={p.id}
                                                        onClick={() => selectPlayer(p)}
                                                        className="px-3 py-2 hover:bg-white/10 cursor-pointer text-sm text-slate-200"
                                                    >
                                                        <span className="font-bold">{p.name}</span>
                                                        {p.club_name && <span className="text-muted-foreground ml-2 text-xs">({p.club_name})</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                <div className="z-0">
                                    <label className="text-xs text-slate-400 mb-1 block">RUT / Pasaporte (Opcional)</label>
                                    <input
                                        name="identification"
                                        id="identification_input"
                                        value={identification}
                                        onChange={e => setIdentification(e.target.value)}
                                        className="w-full h-10 rounded-md border border-white/10 bg-[#0B1120] px-3 text-white text-sm"
                                        placeholder="Ej: 12.345.678-9"
                                    />
                                </div>
                                <div className="z-0">
                                    <label className="text-xs text-slate-400 mb-1 block">Club / Equipo</label>
                                    <select
                                        name="team_name"
                                        value={teamName}
                                        onChange={e => setTeamName(e.target.value)}
                                        className="w-full h-10 rounded-md border border-white/10 bg-[#0B1120] px-3 text-white text-sm"
                                    >
                                        <option value="">-- Seleccionar Club --</option>
                                        {clubs.map(club => (
                                            <option key={club.id} value={club.name}>{club.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Promedio</label>
                                    <input
                                        name="average"
                                        type="number"
                                        step="0.001"
                                        value={average}
                                        onChange={e => setAverage(e.target.value)}
                                        className="w-full h-10 rounded-md border border-white/10 bg-[#0B1120] px-3 text-white text-sm"
                                        placeholder="0.000"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Handicap {tournament.use_handicap && '(Auto)'}</label>
                                    <input
                                        name="handicap"
                                        type="number"
                                        value={handicap}
                                        onChange={e => setHandicap(e.target.value)}
                                        className="w-full h-10 rounded-md border border-white/10 bg-[#0B1120] px-3 text-white text-sm"
                                        placeholder="0"
                                        disabled={tournament.use_handicap} // Disable if auto-calc
                                    />
                                </div>
                                <div className="z-0">
                                    <label className="text-xs text-slate-400 mb-1 block">Ranking</label>
                                    <input
                                        type="number"
                                        value={ranking}
                                        onChange={e => setRanking(e.target.value)}
                                        className="w-full h-10 rounded-md border border-white/10 bg-[#0B1120] px-3 text-white text-sm"
                                        placeholder="Ej: 1500"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-primary-foreground h-9 rounded-md font-medium text-sm disabled:opacity-50"
                            >
                                {loading ? 'Registrando...' : 'Agregar Jugador'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'matches' && (
                <div>
                    {matches.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg flex flex-col items-center gap-4">
                            <p>No hay partidas generadas aún.</p>
                            <button
                                onClick={async () => {
                                    if (!confirm('¿ESTÁS SEGURO? Esto eliminará cualquier fase o grupo corrupto que impida la generación.')) return;
                                    setLoading(true);
                                    try {
                                        const res = await purgeTournament(tournament.id);
                                        if (!res.success) throw new Error(res.message);
                                        alert('Datos de fixture limpiados.');
                                        router.refresh();
                                    } catch (e) { alert(e.message); }
                                    setLoading(false);
                                }}
                                disabled={loading}
                                className="text-xs text-red-400 hover:text-red-300 underline"
                            >
                                (Debug) Resetear Fases/Fixture
                            </button>
                            {players.length >= 2 && (
                                <button
                                    onClick={handlePreview}
                                    disabled={loading}
                                    className="bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-accent/90 flex items-center gap-2"
                                >
                                    Generar Fase de Grupos
                                </button>
                            )}
                        </div>
                    ) : (
                        <MatchTabs
                            matches={matches}
                            loading={loading}
                            setLoading={setLoading}
                            onRefresh={() => router.refresh()}
                            tournamentId={tournament.id}
                            onSelectMatch={setSelectedMatch}
                        />
                    )}
                </div>
            )}

            {selectedMatch && (
                <ManualResultModal
                    match={selectedMatch}
                    onClose={(refreshed) => {
                        setSelectedMatch(null);
                        if (refreshed) router.refresh();
                    }}
                />
            )}

            {editingPlayer && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0B1120] w-full max-w-md rounded-2xl shadow-2xl border border-white/10 p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Editar Jugador</h3>
                        <form onSubmit={handleUpdatePlayer} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-300">Nombre</label>
                                <input
                                    value={editingPlayer.player_name}
                                    onChange={e => setEditingPlayer({ ...editingPlayer, player_name: e.target.value })}
                                    className="w-full h-10 rounded-md border border-white/10 bg-[#131B2D] px-3 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-300">Equipo / Club</label>
                                <select
                                    name="club_id"
                                    defaultValue={editingPlayer.club_id || ''}
                                    onChange={e => setEditingPlayer({ ...editingPlayer, club_id: e.target.value })}
                                    className="w-full h-10 rounded-md border border-white/10 bg-[#131B2D] px-3 text-white"
                                >
                                    <option value="">-- Manual / Sin Club --</option>
                                    {clubs.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Photo Edit Input */}
                            <div>
                                <label className="text-sm font-medium text-slate-300">Foto</label>
                                <input
                                    name="edit_photo"
                                    type="file"
                                    accept="image/*"
                                    className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                                />
                                {editingPlayer.photo_url && (
                                    <p className="text-xs text-slate-500 mt-1">Deja vacío para mantener la foto actual</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-300">Handicap</label>
                                    <input
                                        type="number"
                                        value={editingPlayer.handicap || 0}
                                        onChange={e => setEditingPlayer({ ...editingPlayer, handicap: e.target.value })}
                                        className="w-full h-10 rounded-md border border-white/10 bg-[#131B2D] px-3 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-300">Ranking</label>
                                    <input
                                        type="number"
                                        value={editingPlayer.ranking || 0}
                                        onChange={e => setEditingPlayer({ ...editingPlayer, ranking: e.target.value })}
                                        className="w-full h-10 rounded-md border border-white/10 bg-[#131B2D] px-3 text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingPlayer(null)}
                                    className="flex-1 px-4 py-2 text-sm text-slate-400 hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {previewData && (
                <PreviewModal
                    groups={previewData}
                    onClose={() => setPreviewData(null)}
                    onConfirm={handleGenerateConfirm}
                    loading={loading}
                />
            )}

        </div>
    );
}

// ManualResultModal is imported at top
// This block removes ResultModal definition


function PreviewModal({ groups, onClose, onConfirm, loading }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0B1120] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-white/10 flex flex-col">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-blue-600/10">
                    <div>
                        <h3 className="text-xl font-bold text-white">Vista Previa de Grupos</h3>
                        <p className="text-sm text-blue-400">Distribución calculada por Ranking (Sistema Snake)</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groups.map((group) => (
                            <div key={group.name} className="border border-white/10 rounded-lg bg-[#131B2D] overflow-hidden">
                                <div className="bg-slate-800/50 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white">Grupo {group.name}</span>
                                        {group.schedule && (
                                            <span className="text-[10px] text-blue-400 font-mono">
                                                Mesa {group.schedule.table} • {new Date(group.schedule.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400">{group.players.length} Jugadores</span>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {group.players.map((p, idx) => (
                                        <div key={p.id} className="px-4 py-2 flex items-center gap-3 text-sm">
                                            <span className="text-slate-500 font-mono w-4">{idx + 1}.</span>
                                            <div>
                                                <div className="text-slate-200 font-medium">{p.player_name}</div>
                                                <div className="text-slate-500 text-xs">
                                                    Avg: {p.average || '-'} • Rk: {p.ranking || 0} • HCP: {p.handicap || 0} • {p.team_name}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#0B1120] rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:bg-white/5 rounded-md transition-colors font-medium border border-transparent"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-bold shadow-lg shadow-blue-900/20 disabled:opacity-50"
                    >
                        {loading ? 'Generando...' : 'Confirmar y Generar Fixture'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function MatchTabs({ matches, loading, setLoading, onRefresh, tournamentId, onSelectMatch }) {
    const [activeTab, setActiveTab] = useState('groups');

    // Group logic
    const groupMatches = matches.filter(m => m.phase_type === 'group');
    const eliminationMatches = matches.filter(m => m.phase_type === 'elimination');

    const hasGroups = groupMatches.length > 0;
    const hasElimination = eliminationMatches.length > 0;

    // Build Elimination Rounds Map
    const rounds = {};
    if (hasElimination) {
        eliminationMatches.forEach(m => {
            const r = m.round_number || 1;
            if (!rounds[r]) rounds[r] = [];
            rounds[r].push(m);
        });
    }

    const maxRound = hasElimination ? Math.max(...Object.keys(rounds).map(Number)) : 0;

    // Determine labels based on match count (approximate)
    const getRoundLabel = (roundNum, matchCount) => {
        if (matchCount === 1) return 'Final';
        if (matchCount === 2) return 'Semi-Finales';
        if (matchCount === 4) return 'Cuartos de Final';
        if (matchCount === 8) return 'Octavos de Final';
        return `Ronda ${roundNum}`;
    };

    // Placeholder logic: If we are at Semi (2 matches), next is Final (1 match).
    // If not generated, show disabled tab.
    const tabs = [];
    if (hasGroups) tabs.push({ id: 'groups', label: 'Fase de Grupos' });

    // Existing rounds
    Object.keys(rounds).sort((a, b) => a - b).forEach(r => {
        tabs.push({
            id: `round_${r}`,
            label: getRoundLabel(r, rounds[r].length),
            matches: rounds[r],
            isRound: true,
            roundNumber: parseInt(r)
        });
    });

    // Future placeholders
    // Predict next round matches count
    let lastRoundMatches = hasElimination ? rounds[maxRound] || [] : [];
    let projectedMatches = lastRoundMatches.length / 2;
    let projectedRound = maxRound + 1;

    while (projectedMatches >= 1) {
        tabs.push({
            id: `round_${projectedRound}`,
            label: getRoundLabel(projectedRound, projectedMatches),
            isFuture: true
        });
        projectedMatches /= 2;
        projectedRound++;
    }

    // Default tab selection
    if (activeTab === 'groups' && !hasGroups && hasElimination) {
        // If groups empty, select first round
        // setActiveTab(`round_${Object.keys(rounds)[0]}`); 
        // Cannot update state during render. User needs to click or init logic better.
    }

    const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

    const generatePlayoffsAction = async () => {
        if (!confirm('¿Generar Cruces de Playoffs? Asegúrate de que todos los partidos de grupo estén terminados.')) return;
        setLoading(true);
        try {
            const res = await generatePlayoffs(tournamentId);
            if (!res.success) throw new Error(res.message);
            alert('Llaves generadas exitosamente');
            onRefresh();
            setActiveTab('round_1'); // Switch to first round
        } catch (e) { alert(e.message); }
        setLoading(false);
    };

    const generateNextRoundAction = async () => {
        if (!confirm('¿Generar Siguiente Ronda?')) return;
        setLoading(true);
        try {
            const res = await generateNextRound(tournamentId);
            if (!res.success) throw new Error(res.message);
            alert(res.message);
            onRefresh();
            // Next tab logic would be handled by re-render finding new round
        } catch (e) { alert(e.message); }
        setLoading(false);
    };

    const resetFixtureAction = async () => {
        if (!confirm('¿ESTÁS SEGURO? Eliminará TODO el fixture.')) return;
        setLoading(true);
        try {
            const res = await purgeTournament(tournamentId);
            if (!res.success) throw new Error(res.message);
            alert('Fixture eliminado.');
            onRefresh();
        } catch (e) { alert(e.message); }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            {/* Tabs Header */}
            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => !tab.isFuture && setActiveTab(tab.id)}
                        disabled={tab.isFuture}
                        className={`px-4 py-2 rounded-t-lg text-sm font-bold transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
                                : tab.isFuture
                                    ? 'text-slate-600 cursor-not-allowed bg-white/5'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {tab.label}
                        {tab.isFuture && <span className="ml-2 text-[10px] opacity-50">(Fase previa en curso)</span>}
                    </button>
                ))}

                {/* Reset Button (Always visible but unobtrusive) */}
                <div className="ml-auto">
                    <button
                        onClick={resetFixtureAction}
                        disabled={loading}
                        className="text-xs text-red-500/50 hover:text-red-400 underline px-2"
                    >
                        Resetear Todo
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[200px]">
                {currentTab?.id === 'groups' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-white">Fase de Grupos</h3>
                            {/* Show Generate Playoffs button ONLY if NOT generated yet */}
                            {!hasElimination && (
                                <button
                                    onClick={generatePlayoffsAction}
                                    disabled={loading}
                                    className="bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-orange-500 shadow-sm"
                                >
                                    Generar Llaves Finales
                                </button>
                            )}
                        </div>
                        <MatchGrid matches={groupMatches} onSelect={onSelectMatch} />
                    </div>
                )}

                {currentTab?.isRound && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-white">{currentTab.label}</h3>
                            {/* Show Next Round button ONLY if this is the latest round and not Final */}
                            {currentTab.roundNumber === maxRound && currentTab.matches.length > 1 && (
                                <button
                                    onClick={generateNextRoundAction}
                                    disabled={loading}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-blue-500 shadow-sm"
                                >
                                    Generar Siguiente Ronda
                                </button>
                            )}
                        </div>
                        <MatchGrid matches={currentTab.matches} onSelect={onSelectMatch} />
                    </div>
                )}
            </div>
        </div>
    );
}

function MatchGrid({ matches, onSelect }) {
    if (matches.length === 0) return <div className="text-muted-foreground italic">No hay partidos en esta fase.</div>;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map(m => (
                <div
                    key={m.id}
                    onClick={() => onSelect(m)}
                    className="border border-white/10 rounded-lg p-3 bg-card text-card-foreground shadow-lg cursor-pointer hover:border-blue-500/50 transition-all hover:shadow-blue-900/10 group"
                >
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                        <span className="font-mono">#{m.id} • {m.group_name ? `G.${m.group_name}` : 'Playoff'}</span>
                        <span className="bg-slate-800 px-1.5 rounded text-[10px]">Mesa {m.table_number || '?'}</span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <div className={`font-medium truncate ${m.winner_id === m.player1_id ? 'text-green-400' : 'text-slate-300'}`}>
                                {m.player1_name || '...'}
                            </div>
                            <div className="font-bold text-xl font-mono min-w-[30px] text-right">{m.score_p1}</div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className={`font-medium truncate ${m.winner_id === m.player2_id ? 'text-green-400' : 'text-slate-300'}`}>
                                {m.player2_name || '...'}
                            </div>
                            <div className="font-bold text-xl font-mono min-w-[30px] text-right">{m.score_p2}</div>
                        </div>
                    </div>

                    <div className="mt-3 text-[10px] text-center border-t border-white/5 pt-2 text-slate-500 uppercase tracking-widest font-semibold group-hover:text-blue-400 transition-colors">
                        {m.status === 'completed' ? 'Finalizado' : 'Editar Resultado'}
                    </div>
                </div>
            ))}
        </div>
    );
}
