'use client';

import { useState } from 'react';
import { calculateFechillarHandicap } from '@/app/lib/utils';
import { registerPlayer, generateGroups, updatePlayer, searchPlayers, generatePlayoffs, previewGroups, removePlayer, removePlayers, disqualifyPlayer, purgeTournament, generateNextRound, registerBatchPlayers, assignTablesRandomly, updateMatchTable, swapPlayers, recalculateAllHandicaps } from '@/app/lib/tournament-actions';
import { searchGlobalPlayers } from '@/app/lib/player-actions';
import { generateWhatsAppReport } from '@/app/lib/report-actions';
import ManualResultModal from '@/app/components/admin/ManualResultModal';
import FinalizeTournamentButton from './FinalizeTournamentButton';
import BracketView from './BracketView';
import { useRouter } from 'next/navigation';
import { Copy, MessageSquare, X } from 'lucide-react';

export default function TournamentManager({ tournament, players, matches, clubs = [] }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('players');
    const [loading, setLoading] = useState(false);

    // Estados para formulario de jugador
    const [regMode, setRegMode] = useState('existing'); // 'existing' | 'new' - Mostrar búsqueda primero
    const [globalSearchResults, setGlobalSearchResults] = useState([]);
    const [selectedGlobalPlayers, setSelectedGlobalPlayers] = useState(new Set());

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

    // Help/Instructions State
    const [showHelp, setShowHelp] = useState(false);

    // Report State
    const [reportText, setReportText] = useState('');
    const [isReportOpen, setIsReportOpen] = useState(false);

    const generateReport = async (type) => {
        setLoading(true);
        const text = await generateWhatsAppReport(tournament.id, type);
        setReportText(text);
        setIsReportOpen(true);
        setLoading(false);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(reportText);
        alert('Reporte copiado al portapapeles');
    };

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
        setIdentification(p.identification || '');
        const avg = p.average ? p.average.toString() : '0.000';
        setAverage(avg);
        setHandicap(calculateFechillarHandicap(parseFloat(avg)));
        setShowSuggestions(false);
    };

    // Estado para modal de resultados
    const [selectedMatch, setSelectedMatch] = useState(null);
    // Estado para modal de edición de jugador
    const [editingPlayer, setEditingPlayer] = useState(null);
    // Estado para Swap
    const [swappingSource, setSwappingSource] = useState(null);
    const [swapTargetId, setSwapTargetId] = useState('');

    async function handleSwapExecute() {
        if (!swappingSource || !swapTargetId) return;
        if (!confirm(`¿Confirmar intercambio entre ${swappingSource.player_name} y el jugador seleccionado?`)) return;

        setLoading(true);
        try {
            const res = await swapPlayers(swappingSource.id, parseInt(swapTargetId), tournament.id);
            if (res.success) {
                alert(res.message);
                setSwappingSource(null);
                setSwapTargetId('');
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

    async function handleUpdatePlayer(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('player_name', editingPlayer.player_name);
            formData.append('team_name', editingPlayer.team_name || '');
            formData.append('handicap', editingPlayer.handicap || 0);
            formData.append('ranking', editingPlayer.ranking || 0);
            formData.append('average', editingPlayer.average || 0);
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

    async function handleGenerateConfirm(overrides) {
        setLoading(true);
        try {
            const res = await generateGroups(tournament.id, overrides);
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
        <>
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
                    <div className="ml-auto flex items-center gap-2">
                        <button onClick={() => generateReport('start')} className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded flex items-center gap-1">
                            <MessageSquare size={14} /> Inicio
                        </button>
                        <button onClick={() => generateReport('pending')} className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded flex items-center gap-1">
                            <MessageSquare size={14} /> Pendientes
                        </button>
                        <FinalizeTournamentButton tournament={tournament} />
                    </div>
                </div>
            </div>

            {swappingSource && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0f172a] border border-white/10 rounded-lg p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Sustituir Jugador</h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Sustituir a <span className="text-white font-bold">{swappingSource.player_name}</span> con:
                        </p>

                        <select
                            className="w-full bg-slate-900 border border-white/10 rounded p-2 text-white mb-4"
                            value={swapTargetId}
                            onChange={(e) => setSwapTargetId(e.target.value)}
                        >
                            <option value="">-- Seleccionar Jugador --</option>
                            {players
                                .filter(p => p.id !== swappingSource.id)
                                .sort((a, b) => a.player_name.localeCompare(b.player_name))
                                .map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.player_name} {p.team_name ? `(${p.team_name})` : ''}
                                    </option>
                                ))
                            }
                        </select>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => { setSwappingSource(null); setSwapTargetId(''); }}
                                className="px-3 py-1 text-slate-400 hover:text-white"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSwapExecute}
                                disabled={!swapTargetId || loading}
                                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold"
                            >
                                {loading ? '...' : 'Intercambiar'}
                            </button>
                        </div>
                    </div>
                </div>
            )
            }


            {isReportOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0f172a] border border-white/10 rounded-lg p-6 max-w-md w-full shadow-2xl relative">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Reporte WhatsApp</h3>
                            <button onClick={() => setIsReportOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <textarea
                            className="w-full h-64 bg-black/40 border border-white/10 rounded-md p-3 text-sm font-mono text-slate-300 resize-none focus:outline-none focus:border-blue-500 mb-4"
                            readOnly
                            value={reportText}
                        />
                        <div className="flex justify-end gap-2">
                            <button className="px-4 py-2 text-slate-300 hover:bg-white/5 rounded" onClick={() => setIsReportOpen(false)}>Cerrar</button>
                            <button onClick={copyToClipboard} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded flex items-center gap-2">
                                <Copy size={16} /> Copiar
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {
                activeTab === 'players' && (
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <div className="flex justify-between items-center mb-4 gap-2">
                                <h3 className="font-semibold">Lista de Inscritos (v2)</h3>
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
                                    <button
                                        onClick={async () => {
                                            if (!confirm('¿Recalcular Handicaps de TODOS los jugadores según su Promedio actual?')) return;
                                            setLoading(true);
                                            try {
                                                const res = await recalculateAllHandicaps(tournament.id);
                                                alert(res.message);
                                                router.refresh();
                                            } catch (e) { alert(e.message); }
                                            setLoading(false);
                                        }}
                                        disabled={loading}
                                        className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded flex items-center gap-1 shadow-sm transition-colors"
                                        title="Recalcular Handicaps (Debug)"
                                    >
                                        Recalcular
                                    </button>
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
                                            <div className="text-xs text-slate-400 bg-secondary/50 px-2 py-1 rounded hidden sm:block">Avg: {p.average || '-'}</div>
                                            <div className="text-sm bg-secondary px-2 py-1 rounded hidden sm:block">HCP: {p.handicap}</div>
                                            <div className="sm:hidden flex flex-col text-[10px] text-slate-500 mr-2">
                                                <span>A: {p.average}</span>
                                                <span>H: {p.handicap}</span>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setEditingPlayer(p);
                                                    setPlayerName(p.player_name);
                                                    setTeamName(p.team_name || ''); // Try to match by name if not ID? Ideally we need club_id in p
                                                    // We need club_id in p to edit correctly if using select.
                                                    // Assuming p comes from tournament_players which doesn't have club_id directly unless updated query.
                                                    // Recalculate handicap to be safe or use existing? 
                                                    // Let's rely on average if we edit it, but initially use existing.
                                                    // Actually user wants it auto-calculated.
                                                    setHandicap(calculateFechillarHandicap(parseFloat(p.average || 0)));
                                                    setRanking(p.ranking || '');
                                                    setAverage(p.average || '0.000');
                                                    // ID?
                                                }}
                                                className="text-slate-400 hover:text-blue-400 transition-colors md:opacity-0 md:group-hover:opacity-100"
                                                title="Editar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDisqualify(p)}
                                                className="text-slate-400 hover:text-red-600 transition-colors md:opacity-0 md:group-hover:opacity-100"
                                                title="Expulsar / Descalificar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></svg>
                                            </button>
                                            <button
                                                onClick={() => setSwappingSource(p)}
                                                className="text-[10px] sm:text-xs bg-orange-600 hover:bg-orange-500 text-white px-1.5 py-1 sm:px-2 rounded flex items-center gap-1 shadow-sm transition-colors font-bold uppercase tracking-wider"
                                                title="Sustituir por otro jugador"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="m13 13 6 6" /></svg>
                                                <span className="hidden sm:inline">INTERCAMBIAR</span>
                                            </button>
                                            <button
                                                onClick={() => handleDeletePlayer(p)}
                                                className="text-slate-400 hover:text-red-400 transition-colors md:opacity-0 md:group-hover:opacity-100"
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
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold">Registrar Jugador</h3>
                                <div className="flex bg-slate-800 p-0.5 rounded-lg">
                                    <button
                                        onClick={() => setRegMode('existing')}
                                        className={`px-3 py-1 text-xs rounded-md transition-all ${regMode === 'existing' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        1️⃣ Buscar Jugador
                                    </button>
                                    <button
                                        onClick={() => setRegMode('new')}
                                        className={`px-3 py-1 text-xs rounded-md transition-all ${regMode === 'new' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        2️⃣ Crear Nuevo
                                    </button>
                                </div>
                            </div>

                            {/* Sección de Ayuda/Instructivo */}
                            <div className="mb-4 border border-blue-500/30 rounded-lg overflow-hidden bg-blue-950/20">
                                <button
                                    onClick={() => setShowHelp(!showHelp)}
                                    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-blue-300 hover:bg-blue-900/20 transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                        </svg>
                                        ¿Cómo registrar un jugador?
                                    </span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showHelp ? 'rotate-180' : ''}`}>
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </button>
                                {showHelp && (
                                    <div className="px-4 py-3 text-xs text-slate-300 space-y-2 bg-slate-900/40 border-t border-blue-500/20">
                                        <p className="font-bold text-blue-400">📋 Pasos para inscribir un jugador:</p>
                                        <ol className="list-decimal list-inside space-y-1.5 ml-2">
                                            <li><strong className="text-white">PRIMERO:</strong> Busca al jugador escribiendo su nombre en la pestaña <strong className="text-blue-400">"1️⃣ Buscar Jugador"</strong></li>
                                            <li>Espera que aparezcan los resultados y selecciona marcando la casilla ✓</li>
                                            <li>Presiona el botón verde <strong className="text-green-400">"Agregar Seleccionados"</strong></li>
                                            <li><strong className="text-yellow-400">SOLO si NO existe:</strong> Ve a la pestaña <strong>"2️⃣ Crear Nuevo"</strong> y completa los datos</li>
                                        </ol>
                                        <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-600/40 rounded text-yellow-200">
                                            <p className="font-bold">⚠️ Importante:</p>
                                            <p>Siempre busca primero antes de crear un jugador nuevo para evitar duplicados.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {regMode === 'existing' ? (
                                <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                                    {/* Search Logic */}
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400 mb-1 block">🔍 Buscar jugador por nombre</label>
                                        <input
                                            autoFocus
                                            placeholder="Escribe el nombre del jugador..."
                                            className="w-full h-10 rounded-md border border-white/10 bg-[#0B1120] px-3 text-white text-sm"
                                            onChange={async (e) => {
                                                const term = e.target.value;
                                                if (term.length > 0) {
                                                    try {
                                                        const res = await searchGlobalPlayers(term);
                                                        // Filter out already in tournament
                                                        const currentIds = new Set(players.map(p => p.player_id));

                                                        const filtered = res.filter(p => !currentIds.has(p.id));
                                                        setGlobalSearchResults(filtered);
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                } else {
                                                    setGlobalSearchResults([]);
                                                }
                                            }}
                                        />
                                        <p className="text-[10px] text-slate-500">💡 Tip: Escribe al menos 2 letras del nombre</p>
                                    </div>

                                    {/* Results List */}
                                    <div className="border border-white/10 rounded-md bg-[#0B1120] max-h-60 overflow-y-auto divide-y divide-white/5">
                                        {globalSearchResults.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-slate-400 space-y-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-slate-600 mb-2">
                                                    <circle cx="11" cy="11" r="8" />
                                                    <path d="m21 21-4.35-4.35" />
                                                </svg>
                                                <p className="font-medium">Comienza a escribir para buscar jugadores</p>
                                                <p className="text-slate-500">Se mostrarán todos los jugadores que coincidan con tu búsqueda</p>
                                            </div>
                                        ) : (
                                            globalSearchResults.map(p => (
                                                <div key={p.id} className="flex items-center p-2 hover:bg-white/5 gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedGlobalPlayers.has(p.id)}
                                                        onChange={() => {
                                                            const newSet = new Set(selectedGlobalPlayers);
                                                            if (newSet.has(p.id)) newSet.delete(p.id);
                                                            else newSet.add(p.id);
                                                            setSelectedGlobalPlayers(newSet);
                                                        }}
                                                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-primary"
                                                    />
                                                    <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                                                        {p.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center h-full text-[10px]">{p.name.substring(0, 2)}</span>}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-slate-200">{p.name}</div>
                                                        <div className="text-xs text-slate-500">{p.club_name || 'Sin Club'} • Avg: {p.average || 0}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center bg-card p-2 rounded-md border border-white/5">
                                        <span className="text-xs text-slate-400">Seleccionados: {selectedGlobalPlayers.size}</span>
                                        <button
                                            onClick={async () => {
                                                if (selectedGlobalPlayers.size === 0) return;
                                                setLoading(true);
                                                try {
                                                    const { registerBatchPlayers } = await import('@/app/lib/tournament-actions');
                                                    const res = await registerBatchPlayers(tournament.id, Array.from(selectedGlobalPlayers));
                                                    alert(res.message);
                                                    setSelectedGlobalPlayers(new Set());
                                                    setGlobalSearchResults([]);
                                                    router.refresh();
                                                } catch (e) { alert(e.message); }
                                                setLoading(false);
                                            }}
                                            disabled={loading || selectedGlobalPlayers.size === 0}
                                            className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Agregar Seleccionados
                                        </button>
                                    </div>

                                    <div className="mt-4 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                                        <p className="text-xs text-slate-400 flex items-start gap-2">
                                            <span className="text-lg">❓</span>
                                            <span><strong className="text-white">¿No encuentras al jugador?</strong><br />Verifica la ortografía o cambia a la pestaña <strong className="text-blue-400">"2️⃣ Crear Nuevo"</strong> para registrarlo.</span>
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleAddPlayer} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-card p-4 rounded-lg border border-white/5">
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Nombre Jugador</label>
                                            <div className="relative">
                                                <input
                                                    name="player_name"
                                                    value={playerName}
                                                    onChange={e => {
                                                        setPlayerName(e.target.value);
                                                        if (regMode === 'new') handleSearch(e.target.value); // Keep autocomplete for new creation too? Maybe just simple input
                                                    }}
                                                    className="w-full h-10 rounded-md border border-white/10 bg-[#0B1120] px-3 text-white text-sm"
                                                    placeholder="Nombre..."
                                                    required
                                                    autoComplete="off"
                                                />
                                                {/* Reuse logic for local duplicate warning if needed, but simplified for now */}
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
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setAverage(val);
                                                    setHandicap(calculateFechillarHandicap(parseFloat(val || 0)));
                                                }}
                                                className="w-full h-10 rounded-md border border-white/10 bg-[#0B1120] px-3 text-white text-sm"
                                                placeholder="0.000"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Handicap {tournament.use_handicap && '(Auto)'}</label>
                                            <div className="relative">
                                                <input
                                                    name="handicap"
                                                    type="number"
                                                    value={handicap}
                                                    readOnly={true}
                                                    className="w-full h-10 rounded-md border border-white/10 bg-[#1A2333] px-3 text-slate-400 text-sm cursor-not-allowed font-bold"
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-3 top-2.5 text-[10px] text-green-500 font-bold uppercase">AUTO</span>
                                            </div>
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
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Foto (Opcional)</label>
                                            <input
                                                id="player_photo"
                                                name="photo"
                                                type="file"
                                                accept="image/*"
                                                className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-blue-600 text-white h-9 rounded-md font-medium text-sm disabled:opacity-50 hover:bg-blue-500 transition-colors"
                                    >
                                        {loading ? 'Registrando...' : 'Agregar Nuevo Jugador'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )
            }

            {
                activeTab === 'matches' && (
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
                                <button
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            const { repairGSL } = await import('@/app/lib/tournament-actions');
                                            const res = await repairGSL(tournament.id);
                                            alert(res.message);
                                            router.refresh();
                                        } catch (e) { alert(e.message); }
                                        setLoading(false);
                                    }}
                                    disabled={loading}
                                    className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                                >
                                    (Debug) Reparar GSL (Matches Faltantes)
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
                )
            }

            {
                selectedMatch && (
                    <ManualResultModal
                        match={selectedMatch}
                        onClose={(refreshed) => {
                            setSelectedMatch(null);
                            if (refreshed) router.refresh();
                        }}
                    />
                )
            }

            {
                editingPlayer && (
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
                                        <label className="text-sm font-medium text-slate-300">Promedio</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            value={editingPlayer.average || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setEditingPlayer({
                                                    ...editingPlayer,
                                                    average: val,
                                                    handicap: calculateFechillarHandicap(parseFloat(val || 0))
                                                });
                                            }}
                                            className="w-full h-10 rounded-md border border-white/10 bg-[#131B2D] px-3 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-300">Handicap</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={editingPlayer.handicap || 0}
                                                readOnly={true}
                                                className="w-full h-10 rounded-md border border-white/10 bg-[#1A2333] px-3 text-slate-400 text-sm cursor-not-allowed font-bold"
                                            />
                                            <span className="absolute right-3 top-2.5 text-[10px] text-green-500 font-bold uppercase">AUTO</span>
                                        </div>
                                    </div>
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
                )
            }

            {
                previewData && (
                    <PreviewModal
                        groups={previewData}
                        onClose={() => setPreviewData(null)}
                        onConfirm={handleGenerateConfirm}
                        loading={loading}
                        tournament={tournament}
                    />
                )
            }

        </>
    );
}

// ManualResultModal is imported at top
// This block removes ResultModal definition


function PreviewModal({ groups, onClose, onConfirm, loading, tournament }) {
    // Determine available slots based on tournament config
    // Default range: covering enough slots for groups + buffer
    const tablesAvailable = tournament.tables_available || 4;
    const blockDuration = tournament.block_duration || 180;
    const startDate = new Date(tournament.start_date);
    const groupsCount = groups.length;

    // Calculate how many turns we need normally
    const normalTurns = Math.ceil(groupsCount / tablesAvailable);
    // Offer a few extra turns for flexibility (e.g. +2)
    const MAX_TURNS = normalTurns + 2;

    const slots = [];
    for (let t = 0; t < MAX_TURNS; t++) {
        const turnTime = new Date(startDate.getTime() + (t * blockDuration * 60000));
        slots.push({
            id: t,
            label: `Bloque ${t + 1} - ${turnTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            time: turnTime
        });
    }

    // State for assignments: { groupName: { slotIndex, table } }
    const [assignments, setAssignments] = useState({});

    // Initialize assignments from default groups data
    useEffect(() => {
        const initial = {};
        groups.forEach(g => {
            // Find matching slot index based on time
            const gTime = new Date(g.schedule.startTime).getTime();
            const foundSlot = slots.findIndex(s => Math.abs(s.time.getTime() - gTime) < 1000); // 1s tolerance

            initial[g.name] = {
                slotIndex: foundSlot !== -1 ? foundSlot : 0,
                table: g.schedule.table
            };
        });
        setAssignments(initial);
    }, [groups]);

    const handleAssignChange = (groupName, field, value) => {
        setAssignments(prev => ({
            ...prev,
            [groupName]: {
                ...prev[groupName],
                [field]: parseInt(value)
            }
        }));
    };

    const handleConfirm = () => {
        // Build overrides object
        // Map: groupName -> { startTime: ISOString, table: number }
        const overrides = {};
        Object.keys(assignments).forEach(gName => {
            const assign = assignments[gName];
            const slot = slots[assign.slotIndex]; // Use safe access
            if (slot) {
                overrides[gName] = {
                    startTime: slot.time.toISOString(),
                    table: assign.table
                };
            }
        });
        onConfirm(overrides);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0B1120] w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-white/10 flex flex-col">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-blue-600/10">
                    <div>
                        <h3 className="text-xl font-bold text-white">Vista Previa y Programación</h3>
                        <p className="text-sm text-blue-400">Distribución calculada. Ajusta horarios y mesas según necesidad.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groups.map((group) => {
                            const assign = assignments[group.name] || {};
                            // Safe access to slot time. 
                            // If defaults logic fails, fallbacks to date from props or today.
                            const currentSlot = slots[assign.slotIndex] || slots[0];

                            return (
                                <div key={group.name} className="border border-white/10 rounded-lg bg-[#131B2D] overflow-hidden flex flex-col">
                                    <div className="bg-slate-800/50 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                                        <div className="font-bold text-white">Grupo {group.name}</div>
                                        <span className="text-xs text-slate-400">{group.players.length} Jugadores</span>
                                    </div>

                                    {/* Programming Controls */}
                                    <div className="p-3 bg-slate-900/50 border-b border-white/5 grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-slate-500 block mb-1">Horario / Bloque</label>
                                            <select
                                                className="w-full bg-slate-800 border border-white/10 text-xs text-white rounded p-1"
                                                value={assign.slotIndex ?? 0}
                                                onChange={(e) => handleAssignChange(group.name, 'slotIndex', e.target.value)}
                                            >
                                                {slots.map((s, idx) => (
                                                    <option key={s.id} value={idx}>{s.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 block mb-1">Mesa</label>
                                            <select
                                                className="w-full bg-slate-800 border border-white/10 text-xs text-white rounded p-1"
                                                value={assign.table ?? 1}
                                                onChange={(e) => handleAssignChange(group.name, 'table', e.target.value)}
                                            >
                                                {Array.from({ length: tablesAvailable }).map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>Mesa {i + 1}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="divide-y divide-white/5 flex-1 overflow-y-auto max-h-[200px]">
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
                            );
                        })}
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
                        onClick={handleConfirm}
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

    const handleSorteoAction = async () => {
        const input = prompt('¿Cuántas mesas hay disponibles para el sorteo?', '12');
        if (!input) return;
        const count = parseInt(input);
        if (isNaN(count) || count < 1) return alert('Número inválido');

        setLoading(true);
        try {
            const res = await assignTablesRandomly(tournamentId, count);
            if (!res.success) throw new Error(res.message);
            alert(res.message);
            onRefresh();
        } catch (e) { alert(e.message); }
        setLoading(false);
    };

    const handleEditTableCallback = async (match, newTable) => {
        if (!newTable) return;
        setLoading(true);
        try {
            const res = await updateMatchTable(match.id, parseInt(newTable));
            if (!res.success) throw new Error(res.message);
            onRefresh();
        } catch (e) { alert(e.message); }
        setLoading(false);
    };

    const handleBatchTableEdit = async (tableNum) => {
        // Implement batch update for active view if needed
        // For now, this is just a placeholder or could be used for advanced UI
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
                        <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-white/5">
                            <h3 className="font-bold text-lg text-white">Fase de Grupos</h3>
                            <div className="flex gap-2">
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
                                <button
                                    onClick={handleSorteoAction}
                                    disabled={loading}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-purple-500 shadow-sm"
                                >
                                    Sorteo de Mesas
                                </button>
                            </div>
                        </div>
                        <MatchGrid matches={groupMatches} onSelect={onSelectMatch} onEditTable={handleEditTableCallback} />
                    </div>
                )}

                {currentTab?.isRound && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-white/5">
                            <h3 className="font-bold text-lg text-white">{currentTab.label}</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSorteoAction}
                                    disabled={loading}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-purple-500 shadow-sm"
                                >
                                    Sorteo Mesas
                                </button>
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
                        </div>
                        <MatchGrid matches={currentTab.matches} onSelect={onSelectMatch} onEditTable={handleEditTableCallback} />
                    </div>
                )}
            </div>
        </div>
    );
}

function MatchGrid({ matches, onSelect, onEditTable }) {
    if (matches.length === 0) return <div className="text-muted-foreground italic">No hay partidos en esta fase.</div>;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map(m => (
                <div
                    key={m.id}
                    onClick={() => onSelect(m)}
                    className="border border-white/10 rounded-lg p-3 bg-card text-card-foreground shadow-lg cursor-pointer hover:border-blue-500/50 transition-all hover:shadow-blue-900/10 group relative"
                >
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                        <span className="font-mono">#{m.id} • {m.group_name ? `G.${m.group_name}` : 'Playoff'}</span>
                        <div className="flex gap-2">
                            {/* Time Override / Display - To do: show schedule time if available */}
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const val = prompt('Asignar Mesa #:', m.table_number || '');
                                    if (val) onEditTable(m, val);
                                }}
                                className="bg-slate-800 px-1.5 rounded text-[10px] hover:bg-slate-700 cursor-pointer text-blue-300 flex items-center gap-1"
                                title="Click para asignar mesa manualmente"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                                Mesa {m.table_number || '?'}
                            </span>
                        </div>
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

function LiveStandings({ matches, players }) {
    // Calculate stats
    const stats = {};
    players.forEach(p => {
        stats[p.id] = { ...p, played: 0, won: 0, score: 0, points: 0 };
    });

    matches.filter(m => m.status === 'completed').forEach(m => {
        if (!stats[m.player1_id]) stats[m.player1_id] = { id: m.player1_id, name: m.player1_name || '?', played: 0, won: 0, score: 0, points: 0 };
        if (!stats[m.player2_id]) stats[m.player2_id] = { id: m.player2_id, name: m.player2_name || '?', played: 0, won: 0, score: 0, points: 0 };

        const p1 = stats[m.player1_id];
        const p2 = stats[m.player2_id];

        p1.played++;
        p2.played++;
        p1.score += (m.score_p1 || 0);
        p2.score += (m.score_p2 || 0);

        if (m.winner_id === m.player1_id) { p1.won++; p1.points += 2; p2.points += 1; }
        else if (m.winner_id === m.player2_id) { p2.won++; p2.points += 2; p1.points += 1; }
    });

    const sorted = Object.values(stats).filter(p => p.played > 0 || p.ranking > 0).sort((a, b) => b.points - a.points || b.score - a.score);

    return (
        <div className="bg-[#0B1120] rounded-lg border border-white/10 overflow-hidden">
            <div className="bg-white/5 p-3 text-sm font-bold text-center border-b border-white/10">Clasificación / Rendimiento</div>
            <table className="w-full text-xs text-left">
                <thead className="text-slate-500 uppercase">
                    <tr>
                        <th className="p-2">Jugador</th>
                        <th className="p-2 text-center">PJ</th>
                        <th className="p-2 text-center">Pts</th>
                        <th className="p-2 text-center">Avg</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {sorted.map(p => (
                        <tr key={p.id} className="hover:bg-white/5">
                            <td className="p-2 font-medium text-slate-300 truncate max-w-[100px]">{p.name || p.team_name}</td>
                            <td className="p-2 text-center text-slate-400">{p.played}</td>
                            <td className="p-2 text-center font-bold text-green-400">{p.points}</td>
                            <td className="p-2 text-center text-slate-400">{(p.score / (p.played || 1)).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
