'use client';

import { useState, useTransition, useEffect } from 'react';
import { updateMatchScore, setRefereeName, finishMatch } from '@/app/lib/referee-actions';
import { useRouter } from 'next/navigation';
import ShotClock from './ShotClock';
import { ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/app/lib/utils';

export default function MatchControlClient({ initialMatch }) {
    const router = useRouter();
    const [match, setMatch] = useState(initialMatch);
    const [isPending, startTransition] = useTransition();

    // Timer State
    const [timerStatus, setTimerStatus] = useState('idle');

    // Local State
    const [activePlayer, setActivePlayer] = useState(match.current_player_id ? (match.current_player_id === match.player1_id ? 'p1' : 'p2') : 'p1');
    const [resetTrigger, setResetTrigger] = useState(0);

    // Referee Name Logic
    const [refereeNameInput, setRefereeNameInput] = useState('');
    const [showRefereeModal, setShowRefereeModal] = useState(!match.referee_name);

    // Match Status Logic
    const [isMatchFinished, setIsMatchFinished] = useState(match.status === 'completed');

    // Lag Logic
    // If start_player_id is set, we know lag is done.
    const [hasSelectedStart, setHasSelectedStart] = useState(!!match.start_player_id);

    // Determine Limits
    const isGroup = match.phase_type === 'group';
    let p1Target, p2Target;
    if (match.use_handicap) {
        p1Target = match.player1_handicap;
        p2Target = match.player2_handicap;
    } else {
        const limit = isGroup ? match.group_points_limit : match.playoff_points_limit;
        p1Target = limit;
        p2Target = limit;
    }

    let maxInnings = isGroup ? match.group_innings_limit : match.playoff_innings_limit;
    const isFinal = match.round_label === 'Final' || match.round_label === 'Gran Final';
    if (!isGroup && isFinal) {
        maxInnings = null;
    }

    // Check for finish conditions
    const checkFinish = (currentMatch) => {
        const p1Reached = p1Target && currentMatch.score_p1 >= p1Target;
        const p2Reached = p2Target && currentMatch.score_p2 >= p2Target;
        const inningsReached = maxInnings && currentMatch.innings >= maxInnings;

        if (p1Reached || p2Reached || inningsReached) {
            setIsMatchFinished(true);
        }
    };

    // Optimistic Updates
    const handleUpdate = async (p1Delta, p2Delta, inningDelta, nextPlayerId = null) => {
        if (isMatchFinished) return;

        // Block scoring if timer is not running (only for positive point changes)
        if ((p1Delta > 0 || p2Delta > 0) && timerStatus !== 'running') {
            alert("Debes iniciar el cronómetro para agregar carambolas.");
            return;
        }

        const newState = {
            ...match,
            score_p1: (match.score_p1 || 0) + p1Delta,
            score_p2: (match.score_p2 || 0) + p2Delta,
            innings: (match.innings || 0) + inningDelta
        };
        // Safety checks
        if (newState.score_p1 < 0) newState.score_p1 = 0;
        if (newState.score_p2 < 0) newState.score_p2 = 0;
        if (newState.innings < 0) newState.innings = 0;

        setMatch(newState);
        checkFinish(newState);

        if (p1Delta > 0 || p2Delta > 0) {
            setResetTrigger(prev => prev + 1);
        }

        startTransition(async () => {
            await updateMatchScore(match.id, p1Delta, p2Delta, inningDelta, nextPlayerId);
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
            return match.start_player_id === match.player1_id ? 'standard' : 'swapped';
        }
        return 'standard';
    };
    const [layout, setLayout] = useState(getInitialLayout);

    // Need to update local layout state if start_player_id comes in via refresh but was empty initially? 
    // Effect generally not needed if we trust initialMatch, but good for safety.
    useEffect(() => {
        if (match.start_player_id) {
            setLayout(match.start_player_id === match.player1_id ? 'standard' : 'swapped');
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
        const startPlayerId = startPlayerKey === 'p1' ? match.player1_id : match.player2_id;

        setActivePlayer(startPlayerKey);
        setHasSelectedStart(true);
        setLayout(startPlayerKey === 'p1' ? 'standard' : 'swapped');

        // Save to DB
        await import('@/app/lib/referee-actions').then(mod =>
            mod.setMatchStart(match.id, startPlayerId, startPlayerId) // Start player is also current player initially
        );
    };

    const toggleTurn = () => {
        if (isMatchFinished) return;

        const secondPlayer = layout === 'standard' ? 'p2' : 'p1';
        let inningInc = 0;

        if (activePlayer === secondPlayer) {
            inningInc = 1;
        }

        const nextPlayerKey = activePlayer === 'p1' ? 'p2' : 'p1';
        const nextPlayerId = nextPlayerKey === 'p1' ? match.player1_id : match.player2_id;

        setActivePlayer(nextPlayerKey);
        setResetTrigger(prev => prev + 1);

        // Update DB with turn change logic
        // We assume handleUpdate supports passing nextPlayerId
        handleUpdate(0, 0, inningInc, nextPlayerId);
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

    // ... (Keep Referee/Finished modals)

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
                        <div className="bg-slate-800 px-3 py-1 rounded text-xs font-mono text-orange-400 border border-orange-500/30 flex items-center gap-2">
                            <span>ENTRADA</span>
                            <span className="text-white font-bold text-lg">{match.innings || 0}</span>
                        </div>
                    </div>
                    <span className="text-xs font-medium text-slate-300">
                        {targetDisplay}
                        {maxInnings ? ` • Max: ${maxInnings} ent` : ''}
                    </span>
                </div>
                {/* Referee Name Indicator */}
                <div className="w-10 flex items-center justify-center group relative">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center border border-orange-500/30 font-bold text-xs select-none">
                        J
                    </div>
                    <div className="absolute top-full right-0 mt-2 py-1 px-3 bg-slate-800 text-xs rounded border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none data-[show=true]:opacity-100">
                        {match.referee_name || 'Juez'}
                    </div>
                </div>
            </div>

            {/* Main Control Area */}
            <div className="flex-1 flex flex-col p-4 max-w-xl mx-auto w-full">

                {/* SHOT CLOCK */}
                <ShotClock
                    initialSeconds={match.shot_clock_seconds || 40}
                    activePlayer={activePlayer}
                    resetTrigger={resetTrigger}
                    onStatusChange={setTimerStatus}
                />

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
                            <div className="bg-blue-600 text-white text-xs font-bold text-center py-1 uppercase tracking-widest">
                                AL TIRO
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
                            <div className="bg-blue-600 text-white text-xs font-bold text-center py-1 uppercase tracking-widest">
                                AL TIRO
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-8 flex flex-col gap-3">
                    <button
                        onClick={toggleTurn}
                        className="w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 font-bold py-4 rounded-xl text-lg shadow-lg uppercase tracking-wider border border-white/5 flex items-center justify-center gap-3 active:scale-[0.99] transition-transform"
                    >
                        <ArrowLeftRight size={24} />
                        Finalizar Turno
                    </button>
                    <div className="text-center text-[10px] text-slate-600 uppercase tracking-widest mt-2">
                        Al finalizar el turno, cambiará el jugador activo
                    </div>
                </div>

            </div>
        </div>
    );
}
