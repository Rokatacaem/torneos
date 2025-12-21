'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { calculateGroupStandings, calculateGlobalStandings } from '@/app/lib/standings-utils';
import BracketModule from './BracketModule';
import GeneralTableModule from './GeneralTableModule';
import GroupsModule from './GroupsModule';

export default function TVDashboard({ tournament, matches, players }) {
    const globalStandings = calculateGlobalStandings(matches);
    const groupStandings = calculateGroupStandings(matches);

    // Phases Logic
    const phasesMap = new Map();
    matches.forEach(m => {
        if (m.phase_id) phasesMap.set(m.phase_id, { id: m.phase_id, name: m.phase_name, type: m.phase_type, order: m.sequence_order || 99 });
    });
    const phases = Array.from(phasesMap.values()).sort((a, b) => a.order - b.order);
    const hasElimination = phases.some(p => p.type === 'elimination' || p.type === 'final');

    // Rotation Logic (Groups vs Playoffs)
    const [viewMode, setViewMode] = useState('groups'); // 'groups' or 'playoffs'

    useEffect(() => {
        if (!hasElimination) {
            setViewMode('groups');
            return;
        }

        // Cycle every 15 seconds if we have both phases
        const interval = setInterval(() => {
            setViewMode(prev => prev === 'groups' ? 'playoffs' : 'groups');
        }, 15000);

        return () => clearInterval(interval);
    }, [hasElimination]);

    const finalMatch = matches.find(m => m.phase_type === 'final');
    const championId = finalMatch?.winner_id;
    const champion = championId ? players.find(p => p.id === championId) : null;

    const recordRun = globalStandings.reduce((max, p) => Math.max(max, p.highRun || 0), 0);
    const bestPlayer = globalStandings[0];

    return (
        // 1cm Perimeter (p-4 approx 16px) No overflow.
        <div className="w-screen h-screen bg-[#040e1a] text-white flex flex-col font-sans select-none overflow-hidden p-4">

            {/* --- HEADER (10% Height) --- */}
            <header className="h-[10%] shrink-0 bg-[#061020] border-b-4 border-yellow-600 flex items-center justify-between px-6 relative shadow-xl z-20 rounded-t-lg overflow-hidden">
                {/* Custom Banner Background */}
                {tournament.banner_image_url && (
                    <div className="absolute inset-0 z-0">
                        <img src={tournament.banner_image_url} alt="Banner" className="w-full h-full object-cover opacity-30" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#061020] via-[#061020]/80 to-[#061020]"></div>
                    </div>
                )}

                <div className="flex items-center h-full py-1 z-10 gap-4">
                    <Link
                        href="/"
                        className="text-slate-400 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full border border-white/5"
                        title="Volver a Inicio"
                    >
                        <ArrowLeft size={24} />
                    </Link>

                    {tournament.logo_image_url ? (
                        <div className="aspect-square h-full rounded-full bg-white/10 shadow-lg flex items-center justify-center border-4 border-[#061020] overflow-hidden">
                            <img src={tournament.logo_image_url} alt="Logo" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="aspect-square h-full rounded-full bg-radial-gradient(circle at 30% 30%, #fff, #eab308) shadow-lg flex items-center justify-center border-4 border-[#061020]">
                            <span className="text-[#061020] font-black text-3xl">8</span>
                        </div>
                    )}
                </div>

                <div className="text-center flex-1 mx-4 flex flex-col justify-center h-full z-10">
                    <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-widest leading-none uppercase font-serif drop-shadow-md truncate">
                        <span className="text-yellow-500">{tournament.name?.split(' ')[0] || 'TORNEO'}</span> {tournament.name?.split(' ').slice(1).join(' ')}
                    </h1>

                    {/* Dynamic Rules Display */}
                    <div className="flex items-center justify-center gap-6 mt-2">
                        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded border border-white/10 text-xs lg:text-sm font-bold uppercase tracking-wider text-cyan-400">
                            <span>{viewMode === 'groups' ? 'FASE GRUPOS' : 'FASE FINAL'}</span>
                        </div>

                        <div className="flex items-center gap-4 text-xs lg:text-sm font-bold text-slate-300">
                            <div className="flex items-center gap-1">
                                <span className="text-yellow-500">META:</span>
                                <span className="text-white text-lg leading-none">
                                    {viewMode === 'groups' ? (tournament.group_points_limit || '-') : (tournament.playoff_points_limit || '-')}
                                </span>
                                <span className="text-[10px] text-slate-500">PTS</span>
                            </div>

                            <div className="w-px h-4 bg-white/20"></div>

                            <div className="flex items-center gap-1">
                                <span className="text-yellow-500">MAX:</span>
                                <span className="text-white text-lg leading-none">
                                    {viewMode === 'groups' ? (tournament.group_innings_limit || '-') : (tournament.playoff_innings_limit || '-')}
                                </span>
                                <span className="text-[10px] text-slate-500">ENT</span>
                            </div>

                            <div className="w-px h-4 bg-white/20"></div>

                            <div className="flex items-center gap-1">
                                <span className="text-yellow-500">RELOJ:</span>
                                <span className="text-white text-lg leading-none">{tournament.shot_clock_seconds || 40}</span>
                                <span className="text-[10px] text-slate-500">SEG</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center h-full py-1">
                    <div className="aspect-square h-full rounded-full bg-radial-gradient(circle at 30% 30%, #fff, #ef4444) shadow-lg flex items-center justify-center border-4 border-[#061020]">
                        <span className="text-[#061020] font-black text-3xl">3</span>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT (78% Height) --- */}
            <div className="h-[78%] w-full flex py-2 gap-2 relative z-10 transition-opacity duration-1000 ease-in-out">
                {viewMode === 'playoffs' ? (
                    <>
                        {/* LEFT: BRACKET (65%) */}
                        <div className="w-[65%] h-full rounded-lg border-2 border-cyan-900/40 overflow-hidden shadow-2xl bg-[#0a192f] flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                            <BracketModule matches={matches} phases={phases} />
                        </div>

                        {/* RIGHT: TABLE (35%) */}
                        <div className="w-[35%] h-full rounded-lg border-2 border-cyan-900/40 overflow-hidden shadow-2xl bg-[#0a192f] flex flex-col animate-in fade-in slide-in-from-right-8 duration-700">
                            <GeneralTableModule standings={globalStandings} />
                        </div>
                    </>
                ) : (
                    /* FULL: GROUPS GRID */
                    <div className="w-full h-full rounded-lg border-2 border-cyan-900/40 overflow-hidden shadow-2xl bg-[#0a192f] animate-in fade-in slide-in-from-left-4 duration-500">
                        <GroupsModule standings={groupStandings} />
                    </div>
                )}
            </div>

            {/* --- FOOTER (12% Height) --- */}
            <footer className="h-[12%] shrink-0 bg-[#061020] border-t-4 border-yellow-600 flex relative z-20 rounded-b-lg">

                {/* Panel Records */}
                <div className="w-[20%] bg-[#0a192f] border-r border-white/10 p-4 flex flex-col justify-center gap-1">
                    <div className="flex justify-between items-end border-b border-white/10 pb-1">
                        <span className="text-sm text-cyan-400 font-bold uppercase leading-none mb-1">Mejor Promedio<br />General</span>
                        <div className="text-right leading-none">
                            <span className="text-yellow-400 font-bold text-3xl block">{bestPlayer?.generalAvg || '0.000'}</span>
                            <span className="text-xs text-white uppercase">{bestPlayer?.name?.split(' ').pop()}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-sm text-cyan-400 font-bold uppercase mb-1">Mayor Serie (E)</span>
                        <div className="text-right leading-none">
                            <span className="text-white font-bold text-3xl block">{recordRun}</span>
                            <span className="text-xs text-slate-400 uppercase">Récord Torneo</span>
                        </div>
                    </div>
                </div>

                {/* Promo */}
                <div className="flex-1 flex flex-col items-center justify-center bg-black relative overflow-hidden px-4">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    {champion && champion.photo_url && (
                        <div className="absolute inset-0 z-0 opacity-40">
                            <img src={champion.photo_url} alt="Winner" className="w-full h-full object-cover object-top" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                        </div>
                    )}
                    <div className="text-center z-10 w-full">
                        <h3 className="text-yellow-500 font-black text-4xl lg:text-5xl uppercase tracking-[0.1em] animate-pulse truncate drop-shadow-lg leading-none">
                            {champion ? `¡CAMPEÓN: ${champion.player_name.toUpperCase()}!` : 'GRAN FINAL'}
                        </h3>
                        <p className="text-white text-xl lg:text-2xl font-bold uppercase tracking-[0.3em] mt-2 text-shadow-sm leading-none relative">
                            ENTRADA LIBERADA • SALON PRINCIPAL
                        </p>
                    </div>
                </div>

                {/* Branding */}
                <div className="w-[20%] bg-white flex flex-col items-center justify-center p-2 relative">
                    <div className="text-[#061020] font-black text-sm uppercase text-center mb-2 leading-tight">
                        Copa Hermandad<br />Chile - Argentina
                    </div>
                    <div className="flex items-center gap-4 scale-125 origin-center">
                        <div className="w-10 h-6 bg-red-600 relative border border-slate-300 shadow-md">
                            <div className="absolute top-0 left-0 w-full h-1/2 bg-white"></div>
                            <div className="absolute top-1 left-1 w-2 h-2 bg-blue-800 rounded-sm"></div>
                        </div>
                        <div className="text-slate-900 font-black text-xl">X</div>
                        <div className="w-10 h-6 bg-cyan-200 relative border border-slate-300 shadow-md">
                            <div className="absolute top-0 bottom-0 left-[33%] right-[33%] bg-white"></div>
                        </div>
                    </div>
                    <div className="absolute bottom-1 right-2 w-full text-right pr-2">
                        <div className="text-[10px] text-slate-500 font-bold leading-none">CLUB BILLAR SANTIAGO</div>
                        <div className="text-[8px] text-slate-400 font-medium leading-none mt-1">Dev by Rodrigo Zúñiga</div>
                    </div>
                </div>
            </footer >
        </div >
    );
}

function Clock() { return null; }
