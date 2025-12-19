'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, AlertTriangle } from 'lucide-react';
import { cn } from '@/app/lib/utils';

export default function ShotClock({
    initialSeconds = 40,
    activePlayer,
    onTimeout,
    resetTrigger,
    onStatusChange
}) {
    const [seconds, setSeconds] = useState(initialSeconds);
    const [isRunning, setIsRunning] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, running, paused, timeout

    useEffect(() => {
        if (onStatusChange) onStatusChange(status);
    }, [status, onStatusChange]);

    // Extensions State
    const [extensions, setExtensions] = useState({ p1: 2, p2: 2 });

    // Audio Context
    const audioContextRef = useRef(null);

    // Initialize Audio Context on user interaction
    const initAudio = () => {
        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContextRef.current = new AudioContext();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
    };

    const playBeep = (freq = 440, type = 'sine', duration = 0.1) => {
        try {
            if (!audioContextRef.current) initAudio();
            const ctx = audioContextRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.error("Audio error", e);
        }
    };

    // Timer Logic
    useEffect(() => {
        let interval = null;
        if (status === 'running' && seconds > 0) {
            interval = setInterval(() => {
                setSeconds(prev => {
                    const next = prev - 1;

                    // Audio Cues
                    if (next === 10) playBeep(600, 'square', 0.2); // Warning start
                    if (next <= 5 && next > 0) playBeep(800, 'sawtooth', 0.1); // Critical ticks
                    if (next === 0) {
                        playBeep(200, 'sawtooth', 1.0); // Time over
                        setStatus('timeout');
                        if (onTimeout) onTimeout();
                    }

                    return next;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [status, seconds, onTimeout]);

    // Derived Visual State
    const getVisualState = () => {
        if (status === 'timeout') return 'timeout';
        if (seconds <= 5) return 'critical';
        if (seconds <= 10) return 'warning';
        return 'normal';
    };

    const visualState = getVisualState();

    // Reset Logic
    useEffect(() => {
        if (resetTrigger) {
            setSeconds(initialSeconds);
            setStatus('idle');
            // User can manually start, or we could auto-start if desired.
            // For now, adhering to "Esperando el primer tiro" (IDLE) from pseudocode.
        }
    }, [resetTrigger, initialSeconds]);

    // Handlers
    const handleStart = () => {
        initAudio(); // Ensure audio is ready
        setStatus('running');
    };

    const handlePause = () => {
        setStatus('paused');
    };

    const handleReset = () => {
        setSeconds(initialSeconds);
        setStatus('idle');
    };

    const handleExtension = () => {
        if (status !== 'running' && status !== 'paused' && status !== 'idle') return;

        const playerKey = activePlayer === 'p1' ? 'p1' : 'p2';
        if (extensions[playerKey] > 0) {
            setSeconds(initialSeconds); // Rules often reset to full time (40s)
            setExtensions(prev => ({
                ...prev,
                [playerKey]: prev[playerKey] - 1
            }));
            playBeep(1000, 'sine', 0.3); // Extension confirmation beep
            setStatus('running'); // Ensure running
        } else {
            // Error feedback?
            alert("No hay más extensiones disponibles");
        }
    };

    // Color Helpers
    const getColors = () => {
        switch (visualState) {
            case 'timeout': return 'border-red-600 bg-red-900/30 text-red-500 animate-pulse';
            case 'critical': return 'border-red-500 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]';
            case 'warning': return 'border-yellow-500 text-yellow-500';
            default: return 'border-green-500 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]';
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/10 w-full mb-6 relative overflow-hidden">
            {/* Background Warning Flash */}
            {visualState === 'timeout' && (
                <div className="absolute inset-0 bg-red-500/10 z-0 animate-pulse pointer-events-none" />
            )}

            <div className="flex justify-between w-full px-4 mb-2 z-10">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Timer size={14} />
                    Reloj de Tiro
                </div>
                {/* Active Player Indicator */}
                <div className="text-xs font-bold uppercase tracking-wider text-blue-400">
                    Turno: {activePlayer === 'p1' ? 'Jugador 1' : 'Jugador 2'}
                </div>
            </div>

            {/* Main Timer Display */}
            <div className={cn(
                "relative z-10 text-8xl font-mono font-black border-[6px] rounded-full w-48 h-48 flex items-center justify-center transition-all duration-300 bg-slate-950",
                getColors()
            )}>
                {seconds}
                {status === 'paused' && (
                    <div className="absolute -bottom-4 bg-yellow-600 text-black text-xs font-bold px-2 py-1 rounded-full uppercase tracking-tighter shadow-lg pt-1">
                        PAUSA
                    </div>
                )}
                {status === 'timeout' && (
                    <div className="absolute -bottom-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg pt-1 flex items-center gap-1">
                        <AlertTriangle size={12} fill="currentColor" /> FALTA
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex gap-4 mt-6 w-full justify-center z-10 relative">
                {/* Extension Button */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 md:static md:translate-y-0">
                    <button
                        onClick={handleExtension}
                        disabled={extensions[activePlayer === 'p1' ? 'p1' : 'p2'] === 0 || status === 'timeout'}
                        className="flex flex-col items-center justify-center gap-1"
                    >
                        <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
                            extensions[activePlayer === 'p1' ? 'p1' : 'p2'] > 0
                                ? "border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 active:scale-95"
                                : "border-slate-700 text-slate-700 opacity-50 cursor-not-allowed"
                        )}>
                            <span className="font-bold text-sm">EXT</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium uppercase">
                            Restan: {extensions[activePlayer === 'p1' ? 'p1' : 'p2']}
                        </span>
                    </button>
                </div>

                {/* Play/Pause */}
                {status === 'running' ? (
                    <button
                        onClick={handlePause}
                        className="flex items-center justify-center w-20 h-20 rounded-full bg-yellow-600 hover:bg-yellow-500 text-white transition-all active:scale-95 shadow-xl shadow-yellow-900/20"
                    >
                        <Pause size={40} fill="currentColor" />
                    </button>
                ) : (
                    <button
                        onClick={handleStart}
                        className="flex items-center justify-center w-20 h-20 rounded-full bg-green-600 hover:bg-green-500 text-white transition-all active:scale-95 shadow-xl shadow-green-900/20"
                    >
                        <Play size={40} fill="currentColor" className="ml-1" />
                    </button>
                )}

                {/* Reset Button */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 md:static md:translate-y-0">
                    <button
                        onClick={handleReset}
                        className="flex flex-col items-center justify-center gap-1 group"
                    >
                        <div className="w-12 h-12 rounded-full border-2 border-slate-600 text-slate-400 bg-slate-900 flex items-center justify-center transition-all group-hover:border-slate-500 group-hover:text-white active:scale-95">
                            <RotateCcw size={20} />
                        </div>
                        <span className="text-[10px] text-slate-500 group-hover:text-slate-400 font-medium uppercase">
                            Reset
                        </span>
                    </button>
                </div>
            </div>

        </div>
    );
}

