'use client';

import { useState } from 'react';
import { registerPlayer, generateGroups, updatePlayer, searchPlayers, generatePlayoffs, previewGroups, removePlayer, removePlayers, disqualifyPlayer } from '@/app/lib/tournament-actions';
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
            await generateGroups(tournament.id);
            setPreviewData(null); // Close modal
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
                    <div className="mb-4 flex flex-wrap gap-2 justify-between items-center">
                        <h3 className="font-semibold">Partidas Programadas</h3>
                        <div className="flex gap-2">
                            {matches.length === 0 && players.length >= 2 && (
                                <button
                                    onClick={handlePreview}
                                    disabled={loading}
                                    className="bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-accent/90 flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
                                    Generar Grupos y Fixture
                                </button>
                            )}
                            {matches.length > 0 && matches.some(m => m.phase_type === 'group') && !matches.some(m => m.phase_type === 'elimination') && (
                                <button
                                    onClick={async () => {
                                        if (!confirm('¿Generar Cruces de Playoffs? Asegúrate de que todos los partidos de grupo estén terminados.')) return;
                                        setLoading(true);
                                        try {
                                            await generatePlayoffs(tournament.id);
                                            alert('Llaves generadas');
                                            router.refresh();
                                        } catch (e) { alert(e.message); }
                                        setLoading(false);
                                    }}
                                    disabled={loading}
                                    className="bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-orange-500 shadow-sm"
                                >
                                    Generar Llaves Finales
                                </button>
                            )}
                        </div>
                    </div>

                    {matches.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            No hay partidas generadas aún.
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {matches.map(m => (
                                <div
                                    key={m.id}
                                    onClick={() => setSelectedMatch(m)}
                                    className="border rounded-lg p-3 bg-card text-card-foreground shadow-sm cursor-pointer hover:border-primary transition-colors hover:shadow-md"
                                >
                                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                                        <span>{m.phase_name} - G.{m.group_name} {m.group_start_time && `(${new Date(m.group_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}</span>
                                        <span>Mesa {m.table_number || m.group_table || '?'}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className={`font-medium ${m.winner_id === m.player1_id ? 'text-primary' : ''}`}>
                                            {m.player1_name || 'BYE'}
                                        </div>
                                        <div className="font-bold text-lg">{m.score_p1}</div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className={`font-medium ${m.winner_id === m.player2_id ? 'text-primary' : ''}`}>
                                            {m.player2_name || 'BYE'}
                                        </div>
                                        <div className="font-bold text-lg">{m.score_p2}</div>
                                    </div>
                                    <div className="mt-2 text-xs text-center border-t pt-2 text-muted-foreground">
                                        {m.status === 'completed' ? 'Finalizado' : 'Pendiente - Click para editar'}
                                    </div>
                                </div>
                            ))}
                        </div>
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
                                                    Rk: {p.ranking || 0} • HCP: {p.handicap || 0} • {p.team_name}
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
