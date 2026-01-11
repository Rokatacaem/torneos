'use client';

import { useState, useTransition, useEffect } from 'react';
import { updateMatchScore, setRefereeName, finishMatch, setMatchStart, finishMatchWO } from '@/app/lib/referee-actions';
import { useRouter } from 'next/navigation';
import ShotClock from './ShotClock';
import { ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("MatchControlClient Error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-10 text-red-500 bg-slate-900 min-h-screen">
                    <h1 className="text-2xl font-bold mb-4">Algo salió mal en el control de arbitraje</h1>
                    <pre className="bg-black p-4 rounded text-xs font-mono overflow-auto max-w-full">
                        {this.state.error?.toString()}
                        <br />
                        {this.state.errorInfo?.componentStack}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}

export default function MatchControlClient(props) {
    return (
        <ErrorBoundary>
            <MatchControlClientContent {...props} />
        </ErrorBoundary>
    );
}

function MatchControlClientContent({ initialMatch }) {
    const router = useRouter();
    const [match, setMatch] = useState(initialMatch);
    const [isPending, startTransition] = useTransition();

    // Debug logging (Console only)
    const addLog = (msg) => {
        console.log(`[MC_DEBUG] ${msg}`);
    };

    useEffect(() => {
        console.log("MatchControlClient Loaded - VERSION: 2025-12-21 21:00 FIXES (NoBtn, Innings+1, Copyright)");
    }, []);

    // Timer State
    const [timerStatus, setTimerStatus] = useState('idle');

    // Local State
    const [activePlayer, setActivePlayer] = useState(match.current_player_id ? (match.current_player_id == match.player1_id ? 'p1' : 'p2') : 'p1');
    const [resetTrigger, setResetTrigger] = useState(0);

    // Referee Name Logic
    const [refereeNameInput, setRefereeNameInput] = useState('');
    const [showRefereeModal, setShowRefereeModal] = useState(!match.referee_name);
    const [showWOModal, setShowWOModal] = useState(false);

    // Match Status Logic
    const [isMatchFinished, setIsMatchFinished] = useState(match.status === 'completed');

    // High Run Logic (Local Tracking)
    const [currentRun, setCurrentRun] = useState(0);

    // Lag Logic - Robust Initialization
    // Check localStorage first, then DB
    const getInitialStart = () => {
        if (typeof window === 'undefined') return !!match.start_player_id; // Server/Hydration safe

        try {
            const localStart = localStorage.getItem(`match_start_${match.id}`);
            if (localStart === 'done') return true;
        } catch (e) { }

        return !!match.start_player_id;
    };

    // We use a simple effect to sync local storage on mount if DB says yes
    useEffect(() => {
        if (match.start_player_id) {
            localStorage.setItem(`match_start_${match.id}`, 'done');
        }
    }, [match.start_player_id, match.id]);

    const [hasSelectedStart, setHasSelectedStart] = useState(getInitialStart);

    // Determine Limits
    const isGroup = match.phase_type === 'group';
    let p1Target, p2Target;
    let limit; // Declare limit here for broader scope

    if (match.use_handicap) {
        p1Target = match.player1_handicap;
        p2Target = match.player2_handicap;
        limit = null; // Not applicable for handicap
    } else {
        // Use calculated limit from server if available, otherwise fallback to config
        limit = match.calculated_points_limit || (isGroup ? (match.config_group_points || match.group_points_limit) : (match.config_playoff_points || match.playoff_points_limit));
        p1Target = limit;
        p2Target = limit;
    }

    let maxInningsRaw = match.calculated_innings_limit || (isGroup ? (match.config_group_innings || match.group_innings_limit) : (match.config_playoff_innings || match.playoff_innings_limit));
    let maxInnings = maxInningsRaw ? parseInt(maxInningsRaw) : null;

    const isFinal = match.round_label === 'Final' || match.round_label === 'Gran Final';
    if (!isGroup && isFinal) {
        maxInnings = null;
    }

    // Logic: User wants 1-based "Current Inning".
    // DB stores "Completed Innings" (starts at 0).
    // So Current = Completed + 1.
    // EXCEPT if match is finished due to max innings, we show the Max (e.g. 20), not 21.
    const displayInnings = (isMatchFinished && maxInnings && match.innings >= maxInnings)
        ? match.innings
        : (match.innings || 0) + 1;

    // Define targetDisplay for UI
    let targetDisplay = '';
    if (match.use_handicap) {
        targetDisplay = `Hándicap (${p1Target} - ${p2Target})`;
    } else {
        targetDisplay = `${limit} Puntos`;
    }

    // Contrasalida State
    const [isCounterAttack, setIsCounterAttack] = useState(false);

    // Check for finish conditions
    const checkFinish = (currentMatch, playerJustScoredId) => {
        const p1Reached = p1Target && currentMatch.score_p1 >= p1Target;
        const p2Reached = p2Target && currentMatch.score_p2 >= p2Target;
        const inningsReached = maxInnings && currentMatch.innings >= maxInnings;

        const isStarter = currentMatch.start_player_id === playerJustScoredId;

        // If Starter reaches target FIRST, trigger Contrasalida
        if ((p1Reached || p2Reached) && isStarter && !inningsReached && !isCounterAttack) {
            console.log('CONTRASALIDA TRIGGERED');
            setIsCounterAttack(true);
            return false; // Do NOT finish match yet
        }

        // Normal Finish Conditions:
        // 1. Second player reaches target (Draw or Win).
        // 2. Innings limit reached.

        if (isCounterAttack) {
            // In Contrasalida, match finishes ONLY if the equalizer (2nd player) reaches target.
            const starterId = currentMatch.start_player_id;
            const isP1Starter = starterId === currentMatch.player1_id;

            if (isP1Starter && p2Reached) {
                setIsMatchFinished(true);
                return true;
            }
            if (!isP1Starter && p1Reached) {
                setIsMatchFinished(true);
                return true;
            }
            return false;
        }

        if (p1Reached || p2Reached || inningsReached) {
            setIsMatchFinished(true);
            return true;
        }
        return false;
    };

    // Safety Effect: Auto-finish if innings limit reached
    useEffect(() => {
        if (!isMatchFinished && maxInnings && match.innings >= maxInnings) {
            setIsMatchFinished(true);
        }
    }, [match.innings, maxInnings, isMatchFinished]);

    // Optimistic Updates
    const handleUpdate = async (p1Delta, p2Delta, inningDelta, nextPlayerId = null) => {
        // Block ADDING if finished
        const isAdding = p1Delta > 0 || p2Delta > 0 || inningDelta > 0;
        if (isMatchFinished && isAdding) return;

        // Block scoring if timer not running
        if ((p1Delta > 0 || p2Delta > 0) && timerStatus !== 'running') {
            alert("Debes iniciar el cronómetro para agregar carambolas.");
            return;
        }

        // High Run Calculation
        let newCurrentRun = currentRun;
        let newHighRunP1 = match.high_run_p1 || 0;
        let newHighRunP2 = match.high_run_p2 || 0;

        // Increment/Decrement run
        if (p1Delta !== 0 || p2Delta !== 0) {
            newCurrentRun += (p1Delta + p2Delta);
            if (newCurrentRun < 0) newCurrentRun = 0;
        }

        // Reset run if turn changes (inningDelta > 0) or explicit payer switch
        if (inningDelta > 0 || nextPlayerId) {
            newCurrentRun = 0;
        }

        // Update High Record if exceeded
        if (p1Delta > 0) {
            if (newCurrentRun > newHighRunP1) newHighRunP1 = newCurrentRun;
        }
        if (p2Delta > 0) {
            if (newCurrentRun > newHighRunP2) newHighRunP2 = newCurrentRun;
        }

        const newState = {
            ...match,
            score_p1: (match.score_p1 || 0) + p1Delta,
            score_p2: (match.score_p2 || 0) + p2Delta,
            innings: (match.innings || 0) + inningDelta,
            high_run_p1: newHighRunP1,
            high_run_p2: newHighRunP2
        };
        // Safety checks
        if (newState.score_p1 < 0) newState.score_p1 = 0;
        if (newState.score_p2 < 0) newState.score_p2 = 0;
        if (newState.innings < 0) newState.innings = 0;

        setMatch(newState);
        setCurrentRun(newCurrentRun);

        // Determine who just scored/played
        // If p1Delta > 0, it was p1. If p2Delta > 0, it was p2.
        // If only inningDelta, it was the activePlayer finishing turn.
        const playerJustScoredId = p1Delta > 0 ? match.player1_id : (p2Delta > 0 ? match.player2_id : (activePlayer === 'p1' ? match.player1_id : match.player2_id));

        const finished = checkFinish(newState, playerJustScoredId);

        // If Contrasalida just triggered (by scoring), we must Force Turn Switch immediately?
        // No, Contrasalida rule implies the starter FINISHES their run (reaches target).
        // Then the turn passes to opponent for the equalizer.
        // So if p1Delta causes score >= target and p1 is starter => setIsCounterAttack(true).
        // The turn switch happens normally or we force it?
        // In billiards, you keep shooting until you miss or reach distance.
        // If you reach distance, your turn is OVER (successfully).
        // So yes, we should force toggleTurn if distance reached during Contrasalida trigger.

        if (!finished && !isCounterAttack && newState.score_p1 >= p1Target && newState.start_player_id === match.player1_id) {
            // P1 (Starter) reached target. Trigger Contrasalida.
            // AND Automatically switch turn to Opponent (P2) so they can play their last turn.
            addLog("Contrasalida triggered for P1. Switching to P2.");
            setIsCounterAttack(true);

            // Force switch to P2
            const nextPlayerId = match.player2_id;
            setActivePlayer('p2');
            setResetTrigger(prev => prev + 1);
            // We are already inside handleUpdate, so we just need to insure the DB update reflects the new player?
            // Actually handleUpdate calls updateMatchScore with `nextPlayerId`.
            // So we override the default `nextPlayerId` (which was null) with match.player2_id

            // But wait, updateMatchScore is async.
            // We need to pass the NEW active player ID to the server update.
            startTransition(async () => {
                await updateMatchScore(match.id, { p1Delta, p2Delta, inningDelta, currentPlayerId: nextPlayerId, highRunP1: newHighRunP1, highRunP2: newHighRunP2 });
                router.refresh();
            });
            return; // Exit here effectively, as we handled the transition manually
        }

        if (!finished && !isCounterAttack && newState.score_p2 >= p2Target && newState.start_player_id === match.player2_id) {
            // P2 (Starter) reached target. Trigger Contrasalida.
            addLog("Contrasalida triggered for P2. Switching to P1.");
            setIsCounterAttack(true);

            // Force switch to P1
            const nextPlayerId = match.player1_id;
            setActivePlayer('p1');
            setResetTrigger(prev => prev + 1);

            startTransition(async () => {
                await updateMatchScore(match.id, { p1Delta, p2Delta, inningDelta, currentPlayerId: nextPlayerId, highRunP1: newHighRunP1, highRunP2: newHighRunP2 });
                router.refresh();
            });
            return;
        }

        if (p1Delta > 0 || p2Delta > 0) {
            setResetTrigger(prev => prev + 1);
        }

        startTransition(async () => {
            await updateMatchScore(match.id, { p1Delta, p2Delta, inningDelta, currentPlayerId: nextPlayerId, highRunP1: newHighRunP1, highRunP2: newHighRunP2 });
            router.refresh();
        });
    };

    const handleRefereeSubmit = async (e) => {
        e.preventDefault();
        if (!refereeNameInput.trim()) return;

        // Optimistic update
        setMatch(prev => ({ ...prev, referee_name: refereeNameInput }));
        setShowRefereeModal(false);

        await setRefereeName(match.id, refereeNameInput);
    };

    // Layout State (Standard = P1 Left, Swapped = P2 Left)
    // Initialize based on start_player_id if exists
    const getInitialLayout = () => {
        if (match.start_player_id) {
            return match.start_player_id == match.player1_id ? 'standard' : 'swapped';
        }
        return 'standard';
    };
    const [layout, setLayout] = useState(getInitialLayout);

    // Need to update local layout state if start_player_id comes in via refresh but was empty initially? 
    // Effect generally not needed if we trust initialMatch, but good for safety.
    useEffect(() => {
        if (match.start_player_id) {
            setLayout(match.start_player_id == match.player1_id ? 'standard' : 'swapped');
            setHasSelectedStart(true);
        }
    }, [match.start_player_id, match.player1_id]);

    // Also update activePlayer if from server
    useEffect(() => {
        if (match.current_player_id) {
            setActivePlayer(match.current_player_id === match.player1_id ? 'p1' : 'p2');
        }
    }, [match.current_player_id, match.player1_id]);


    const handleStartSelection = async (startPlayerKey) => {
        try {
            addLog(`Selecting start: ${startPlayerKey}`);
            const startPlayerId = startPlayerKey === 'p1' ? match.player1_id : match.player2_id;

            if (!startPlayerId) {
                addLog("ERROR: ID missing");
                console.error("ID de jugador no encontrado");
                return;
            }

            // 1. Actualización Local Inmediata
            setActivePlayer(startPlayerKey);
            setHasSelectedStart(true);
            setLayout(startPlayerKey === 'p1' ? 'standard' : 'swapped');

            // Backup to local storage
            localStorage.setItem(`match_start_${match.id}`, 'done');
            addLog("Local state set + localStorage saved");

            // 2. Actualización Optimista del Objeto Match
            setMatch(prev => ({
                ...prev,
                start_player_id: startPlayerId,
                current_player_id: startPlayerId,
                status: 'in_progress'
            }));

            // 3. Persistencia en DB
            await setMatchStart(match.id, startPlayerId, startPlayerId);
            addLog("Server action called");
        } catch (error) {
            addLog(`ERROR: ${error.message}`);
            console.error("Error al guardar selección:", error);
            setHasSelectedStart(false); // Revertir en caso de error
            alert("No se pudo guardar la selección. Intente nuevamente.");
        }
    };

    const toggleTurn = () => {
        if (isMatchFinished) return;

        // [CONTRASALIDA LOGIC]
        // If Contrasalida is Active:
        // 1. If Active Player is Starter: Switch to Opponent (Give them the chance).
        // 2. If Active Player is Opponent: They missed or finished. Match Over.
        const isStarterActive = activePlayer === (match.start_player_id === match.player1_id ? 'p1' : 'p2');

        if (isCounterAttack && !isStarterActive) {
            // Opponent just finished their Contrasalida turn
            setIsMatchFinished(true);
            return;
        }

        // If Starter is active and Contrasalida is true, we simply proceed to switch turn as normal.

        const secondPlayer = layout === 'standard' ? 'p2' : 'p1';
        let inningInc = 0;

        if (activePlayer === secondPlayer) {
            inningInc = 1;
        }

        // PREVENT EXCEEDING LIMIT
        const nextInnings = (match.innings || 0) + inningInc;
        if (maxInnings && nextInnings >= maxInnings) { // Use >= to capture equality finish
            // Exception: If Player 2 is playing, and Player 1 started, this is the equalizing inning.
            // But maxInnings usually means absolute stop.
            // Let's stick to simple: if innings limit reached, finish.
            inningInc = 0;
            setIsMatchFinished(true);
            return;
        }

        const nextPlayerKey = activePlayer === 'p1' ? 'p2' : 'p1';
        const nextPlayerId = nextPlayerKey === 'p1' ? match.player1_id : match.player2_id;

        setActivePlayer(nextPlayerKey);
        setResetTrigger(prev => prev + 1);

        // Update DB with turn change logic
        // We assume handleUpdate supports passing nextPlayerId
        handleUpdate(0, 0, inningInc, nextPlayerId);
        setCurrentRun(0); // Reset local run on manual toggle
    };

    // Helper to get render data
    const getPlayerData = (side) => {
        // side: 'left' or 'right'
        // layout='standard' -> Left=P1(White), Right=P2(Yellow)
        // layout='swapped'  -> Left=P2(White), Right=P1(Yellow)

        const isPlayer1 = (layout === 'standard' && side === 'left') || (layout === 'swapped' && side === 'right');

        if (isPlayer1) {
            return {
                key: 'p1',
                name: match.player1_name || 'Jugador 1',
                score: match.score_p1 || 0,
                isWhite: side === 'left', // If on left, it's White by definition of this requirement
                ballColorText: side === 'left' ? 'Bola Blanca' : 'Bola Amarilla',
                ballColorClass: side === 'left' ? 'text-white' : 'text-yellow-400'
            };
        } else {
            return {
                key: 'p2',
                name: match.player2_name || 'Jugador 2',
                score: match.score_p2 || 0,
                isWhite: side === 'left',
                ballColorText: side === 'left' ? 'Bola Blanca' : 'Bola Amarilla',
                ballColorClass: side === 'left' ? 'text-white' : 'text-yellow-400'
            };
        }
    };

    const left = getPlayerData('left');
    const right = getPlayerData('right');

    const handleScoreClick = (playerKey, delta) => {
        // [NEW] Strict Validation: Only active player can score
        if (playerKey !== activePlayer) return;

        if (playerKey === 'p1') handleUpdate(delta, 0, 0);
        else handleUpdate(0, delta, 0);
    };

    // ... (Keep other modals same)

    if (!hasSelectedStart && !isMatchFinished) {
        // ... (Keep existing Lag Modal code but ensure it calls updated handleStartSelection)
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in duration-500">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-orange-500 uppercase tracking-widest">Definir Salida</h1>
                    <p className="text-slate-400">¿Quién ganó el arrime?</p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                    <button
                        onClick={() => handleStartSelection('p1')}
                        className="p-6 bg-slate-900 border border-white/10 rounded-xl hover:border-white hover:bg-white/10 active:scale-95 transition-all text-center flex flex-col items-center gap-4 group"
                    >
                        {/* White Ball Style */}
                        <div className="w-16 h-16 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.3)] flex items-center justify-center text-2xl font-black text-black group-hover:scale-110 transition-transform">
                        </div>
                        <span className="font-bold text-lg text-white group-hover:text-white transition-colors">{match.player1_name}</span>
                        <span className="text-xs uppercase text-slate-500 font-bold tracking-widest">Bola Blanca</span>
                    </button>

                    <button
                        onClick={() => handleStartSelection('p2')}
                        className="p-6 bg-slate-900 border border-white/10 rounded-xl hover:border-yellow-400 hover:bg-yellow-900/10 active:scale-95 transition-all text-center flex flex-col items-center gap-4 group"
                    >
                        {/* Yellow Ball Style */}
                        <div className="w-16 h-16 rounded-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] flex items-center justify-center text-2xl font-black text-black group-hover:scale-110 transition-transform">
                        </div>
                        <span className="font-bold text-lg text-white group-hover:text-yellow-400 transition-colors">{match.player2_name}</span>
                        <span className="text-xs uppercase text-yellow-600 font-bold tracking-widest">Bola Amarilla</span>
                    </button>
                </div>
            </div>
        );
    }

    // Match Finished Modal
    if (isMatchFinished) {
        // Determine winner based on score
        const p1Score = match.score_p1 || 0;
        const p2Score = match.score_p2 || 0;
        let winnerName, winnerColor;

        if (p1Score > p2Score) {
            winnerName = match.player1_name;
            winnerColor = "text-white"; // Assuming P1 White
        } else if (p2Score > p1Score) {
            winnerName = match.player2_name;
            winnerColor = "text-yellow-400"; // Assuming P2 Yellow
        } else {
            winnerName = "Empate";
            winnerColor = "text-slate-300";
        }

        return (
            <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-500">
                <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
                    {/* Confetti effect or similar could go here */}

                    <div className="p-8 text-center space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Partido Finalizado</h2>
                            <h1 className="text-4xl font-black text-white uppercase italic tracking-wider">
                                {winnerName === "Empate" ? "EMPATE" : "¡GANADOR!"}
                            </h1>
                        </div>

                        {winnerName !== "Empate" && (
                            <div className="py-6">
                                <div className={cn("text-5xl font-black drop-shadow-lg", winnerColor)}>
                                    {winnerName}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 bg-black/40 rounded-2xl p-6 border border-white/5">
                            <div className="text-center">
                                <div className="text-xs text-slate-500 font-bold uppercase mb-1">{match.player1_name}</div>
                                <div className="text-4xl font-black text-white">{p1Score}</div>
                            </div>
                            <div className="text-center border-l border-white/10">
                                <div className="text-xs text-slate-500 font-bold uppercase mb-1">{match.player2_name}</div>
                                <div className="text-4xl font-black text-yellow-400">{p2Score}</div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => setIsMatchFinished(false)}
                                className="flex-1 py-4 rounded-xl font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                            >
                                Corregir
                            </button>
                            <button
                                onClick={async () => {
                                    // Determine Winner ID based on current scores
                                    let winnerId = null;
                                    const finalP1 = match.score_p1 || 0;
                                    const finalP2 = match.score_p2 || 0;

                                    if (finalP1 > finalP2) winnerId = match.player1_id;
                                    else if (finalP2 > finalP1) winnerId = match.player2_id;

                                    await finishMatch(match.id, winnerId);
                                    router.push('/referee');
                                }}
                                className="flex-1 py-4 rounded-xl font-bold bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20 transition-all active:scale-95"
                            >
                                Finalizar y Salir
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Referee Name Modal
    if (showRefereeModal && hasSelectedStart && !isMatchFinished) {
        return (
            <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-[#1A2333] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                    <div className="p-6 text-center space-y-4">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto text-blue-400">
                            <CheckCircle2 size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Identificar Árbitro</h2>
                            <p className="text-sm text-slate-400">Por favor, ingresa tu nombre para el acta del partido.</p>
                        </div>
                        <form onSubmit={handleRefereeSubmit} className="space-y-4">
                            <input
                                type="text"
                                value={refereeNameInput}
                                onChange={(e) => setRefereeNameInput(e.target.value)}
                                placeholder="Nombre Juez / Árbitro"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors text-center font-medium"
                                autoFocus
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowRefereeModal(false)}
                                    className="px-4 py-3 rounded-xl font-bold text-slate-400 hover:bg-white/5 transition-colors"
                                >
                                    Omitir
                                </button>
                                <button
                                    type="submit"
                                    disabled={!refereeNameInput.trim()}
                                    className="px-4 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // WO Modal
    if (showWOModal) {
        return (
            <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
                    <div className="p-6 text-center space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-red-500 uppercase tracking-widest">Declarar Walkover (W.O.)</h2>
                            <p className="text-slate-400 text-sm">El jugador ausente perderá el partido con 0 puntos.</p>
                            <p className="text-white font-bold">¿Quién es el GANADOR (Presente)?</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={async () => {
                                    if (confirm(`¿Confirmar W.O. a favor de ${match.player1_name}?`)) {
                                        // Calculate target points (limit)
                                        // p1Target is already calculated in scope? No, it's inside render.
                                        // We need to pass it or calc it. 
                                        // Actually `p1Target` is calculated in the component scope above.
                                        await finishMatchWO(match.id, match.player1_id, p1Target || 0);
                                        router.refresh();
                                    }
                                }}
                                className="p-4 bg-slate-800 hover:bg-green-900/40 border border-white/10 hover:border-green-500/50 rounded-xl transition-all group"
                            >
                                <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Ganador</span>
                                <span className="block text-lg font-bold text-white group-hover:text-green-400">{match.player1_name}</span>
                            </button>

                            <button
                                onClick={async () => {
                                    if (confirm(`¿Confirmar W.O. a favor de ${match.player2_name}?`)) {
                                        await finishMatchWO(match.id, match.player2_id, p2Target || 0);
                                        router.refresh();
                                    }
                                }}
                                className="p-4 bg-slate-800 hover:bg-green-900/40 border border-white/10 hover:border-green-500/50 rounded-xl transition-all group"
                            >
                                <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Ganador</span>
                                <span className="block text-lg font-bold text-white group-hover:text-green-400">{match.player2_name}</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowWOModal(false)}
                            className="w-full py-3 rounded-xl font-bold text-slate-400 hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-orange-500/30">
            {/* Top Bar for Referee */}
            <div className="bg-slate-900/80 backdrop-blur-md p-3 border-b border-white/10 flex justify-between items-center sticky top-0 z-50 shadow-md">
                <button onClick={() => router.push('/referee')} className="p-2 text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <div className="text-center flex flex-col">
                    <div className="flex items-center gap-3 justify-center mb-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{match.phase_name || 'PARTIDO'}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-300">
                        {targetDisplay}
                        {maxInnings ? ` • Max: ${maxInnings} ent` : ''}
                    </span>
                </div>
                {/* Referee Name Indicator */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowWOModal(true)}
                        className="px-2 py-1 bg-red-900/50 hover:bg-red-600 border border-red-500/30 rounded text-[10px] font-bold text-red-200 hover:text-white transition-colors uppercase tracking-wider"
                    >
                        W.O.
                    </button>
                    <div className="w-10 flex items-center justify-center group relative">
                        <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center border border-orange-500/30 font-bold text-xs select-none">
                            J
                        </div>
                        <div className="absolute top-full right-0 mt-2 py-1 px-3 bg-slate-800 text-xs rounded border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none data-[show=true]:opacity-100">
                            {match.referee_name || 'Juez'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Control Area */}
            <div className="flex-1 flex flex-col p-4 max-w-xl mx-auto w-full relative">


                {/* SHOT CLOCK */}
                <ShotClock
                    initialSeconds={match.config_shot_clock || match.shot_clock_seconds || 40}
                    activePlayer={activePlayer}
                    resetTrigger={resetTrigger}
                    onStatusChange={setTimerStatus}
                />

                {/* LARGE INNINGS DISPLAY */}
                <div className="flex justify-center my-2">
                    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl px-12 py-4 flex flex-col items-center shadow-2xl backdrop-blur-sm">
                        <span className="text-orange-500 font-bold tracking-[0.2em] text-xs uppercase mb-1">Entrada Actual</span>
                        <span className="text-6xl md:text-7xl font-black text-white tabular-nums leading-none tracking-tighter">
                            {displayInnings}
                        </span>
                    </div>
                </div>

                {/* Score Controls */}
                <div className="flex-1 flex gap-4 mt-6">
                    {/* LEFT COLUMN */}
                    <div className={cn(
                        "flex-1 flex flex-col rounded-2xl overflow-hidden border transition-all duration-300",
                        activePlayer === left.key ? "border-blue-500 bg-blue-900/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]" : "border-white/10 opacity-60 grayscale"
                    )}>
                        <div className="p-3 text-center border-b border-white/10 bg-black/20">
                            <span className={`text-[10px] font-bold uppercase tracking-wider block ${left.ballColorClass}`}>{left.ballColorText}</span>
                            <span className="font-bold text-lg leading-tight line-clamp-1">{left.name}</span>
                        </div>
                        <div className="flex-1 flex flex-col relative">
                            {/* Score Display / Add Button */}
                            <button
                                onClick={() => handleScoreClick(left.key, 1)}
                                className="flex-1 flex items-center justify-center bg-transparent active:bg-blue-500/20 transition-colors group"
                            >
                                <span className="text-8xl font-black font-mono leading-none group-active:scale-95 transition-transform">
                                    {left.score || 0}
                                </span>
                            </button>
                            {/* Minus Button */}
                            <button
                                onClick={() => handleScoreClick(left.key, -1)}
                                className="absolute top-2 left-2 text-slate-500 hover:text-red-400 p-2"
                            >
                                -1
                            </button>
                        </div>
                        {/* Status Bar */}
                        {activePlayer === left.key && (
                            <div className="bg-blue-600 text-white text-xs font-bold text-center py-1 uppercase tracking-widest flex justify-between px-2">
                                <span>AL TIRO</span>
                                <span>SERIE: {currentRun}</span>
                            </div>
                        )}
                    </div>

                    {/* Change Turn Button (Middle) */}
                    <div className="flex flex-col justify-center items-center gap-2">
                        <button
                            onClick={toggleTurn}
                            className="w-12 h-12 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all shadow-lg text-slate-300 hover:text-white"
                        >
                            <ArrowLeftRight size={20} />
                        </button>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className={cn(
                        "flex-1 flex flex-col rounded-2xl overflow-hidden border transition-all duration-300",
                        activePlayer === right.key ? "border-blue-500 bg-blue-900/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]" : "border-white/10 opacity-60 grayscale"
                    )}>
                        <div className="p-3 text-center border-b border-white/10 bg-black/20">
                            <span className={`text-[10px] font-bold uppercase tracking-wider block ${right.ballColorClass}`}>{right.ballColorText}</span>
                            <span className="font-bold text-lg leading-tight line-clamp-1">{right.name}</span>
                        </div>
                        <div className="flex-1 flex flex-col relative">
                            {/* Score Display / Add Button */}
                            <button
                                onClick={() => handleScoreClick(right.key, 1)}
                                className="flex-1 flex items-center justify-center bg-transparent active:bg-blue-500/20 transition-colors group"
                            >
                                <span className="text-8xl font-black font-mono leading-none group-active:scale-95 transition-transform">
                                    {right.score || 0}
                                </span>
                            </button>
                            {/* Minus Button */}
                            <button
                                onClick={() => handleScoreClick(right.key, -1)}
                                className="absolute top-2 right-2 text-slate-500 hover:text-red-400 p-2"
                            >
                                -1
                            </button>
                        </div>
                        {/* Status Bar */}
                        {activePlayer === right.key && (
                            <div className="bg-blue-600 text-white text-xs font-bold text-center py-1 uppercase tracking-widest flex justify-between px-2">
                                <span>AL TIRO</span>
                                <span>SERIE: {currentRun}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Actions */}
                {/* Bottom Actions Removed per user request */}

            </div>
            {/* Contrasalida Banner */}
            {isCounterAttack && (
                <div className="bg-red-600 text-white text-center py-2 font-black uppercase text-xl animate-pulse shadow-lg tracking-widest border-y-2 border-white">
                    ⚠️ Contrasalida: Último Turno ⚠️
                </div>
            )}
        </div>
    );
}
