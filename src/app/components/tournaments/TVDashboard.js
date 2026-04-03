'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { calculateGroupStandings, calculateGlobalStandings } from '@/app/lib/standings-utils';
import BracketModule from './BracketModule';
import GeneralTableModule from './GeneralTableModule';
import GroupsModule from './GroupsModule';
import TVMatchesModule from './TVMatchesModule';

export default function TVDashboard({ tournament, matches, players }) {
    const globalStandings = calculateGlobalStandings(matches);
    const groupStandings = calculateGroupStandings(matches);
    const router = useRouter();

    // Auto-Refresh Logic (Every 10 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh();
        }, 10000);
        return () => clearInterval(interval);
    }, [router]);

    // Phases Logic
    const phasesMap = new Map();
    matches.forEach(m => {
        if (m.phase_id) phasesMap.set(m.phase_id, { id: m.phase_id, name: m.phase_name, type: m.phase_type, order: m.sequence_order || 99 });
    });
    const phases = Array.from(phasesMap.values()).sort((a, b) => a.order - b.order);
    const hasElimination = phases.some(p => p.type === 'elimination' || p.type === 'final');

    // Rotation Logic (Ranking -> Matches -> Bracket)
    const [viewMode, setViewMode] = useState('ranking'); // 'ranking', 'matches', 'bracket'

    useEffect(() => {
        // Cycle every 15 seconds
        const interval = setInterval(() => {
            setViewMode(prev => {
                if (prev === 'ranking') return 'matches';
                if (prev === 'matches') return hasElimination ? 'bracket' : 'ranking';
                if (prev === 'bracket') return 'ranking';
                return 'ranking';
            });
        }, 15000);

        return () => clearInterval(interval);
    }, [hasElimination]);

    // Filter active matches for Matches View
    // Prioritize In Progress, then Scheduled.
    // If none, show Completed from latest phase.
    // Safe sort helper
    const safeSortMatches = (arr) => {
        if (!arr) return [];
        return arr.sort((a, b) => {
            const dateA = a.updated_at ? String(a.updated_at) : '';
            const dateB = b.updated_at ? String(b.updated_at) : '';
            return dateB.localeCompare(dateA);
        });
    };

    // Filter active matches for Matches View
    const matchesList = matches || [];
    const activeMatches = matchesList.filter(m => m.status === 'in_progress' || m.status === 'scheduled')
        .sort((a, b) => {
            if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
            if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
            return (Number(a.id) || 0) - (Number(b.id) || 0);
        });

    // If no active matches, show recent completed (last 12?)
    const completedMatches = matchesList.filter(m => m.status === 'completed');

    const displayMatches = activeMatches.length > 0
        ? activeMatches
        : safeSortMatches(completedMatches).slice(0, 12);

    // Placeholder data for Footer records to avoid crash
    const bestPlayer = null; 
    const recordRun = 0;
    const champion = null;

    return (
        // 1cm Perimeter (p-4 approx 16px) No overflow.
        <div className="w-screen h-screen bg-[#040e1a] text-white flex flex-col font-sans select-none overflow-hidden p-4 relative">
            {/* Full Screen Banner Background */}
            {tournament.banner_image_url && (
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <img 
                        src={tournament.banner_image_url} 
                        alt="Background" 
                        className="w-full h-full object-cover opacity-10 scale-105 blur-[2px]" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#040e1a]/80 via-transparent to-[#040e1a]/80"></div>
                </div>
            )}

            {/* --- HEADER (8% Height) --- */}
            <header className="h-[8%] shrink-0 bg-[#061020]/90 backdrop-blur-md border-b-4 border-yellow-600 flex items-center justify-between px-6 relative shadow-xl z-20 rounded-t-lg overflow-hidden">

                <div className="flex items-center h-full py-1 z-10 gap-4">
                    <Link
                        href="/"
                        className="text-slate-400 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full border border-white/5"
                        title="Volver a Inicio"
                    >
                        <ArrowLeft size={20} />
                    </Link>

                    {/* Federation Logo (FECHILLAR) */}
                    <div className="h-full py-1">
                        <img src="/Logo3DAzul.png" alt="FECHILLAR" className="h-full w-auto object-contain drop-shadow-md" />
                    </div>

                    <div className="w-px h-8 bg-white/10 mx-2"></div>

                    {/* Tournament Logo */}
                    {tournament.logo_image_url ? (
                        <div className="aspect-square h-full py-1">
                            <img src={tournament.logo_image_url} alt="Logo" className="h-full w-auto object-contain drop-shadow-md" />
                        </div>
                    ) : (
                        <div className="aspect-square h-full rounded-full bg-yellow-500 shadow-lg flex items-center justify-center border-2 border-[#061020] p-1.5">
                            <span className="text-[#061020] font-black text-xl">8</span>
                        </div>
                    )}
                </div>

                <div className="text-center flex-1 mx-4 flex flex-col justify-center h-full z-10">
                    <h1 className="text-2xl lg:text-3xl xl:text-4xl font-black text-white tracking-widest leading-none uppercase font-serif drop-shadow-md truncate">
                        <span className="text-yellow-500">{tournament.name?.split(' ')[0] || 'TORNEO'}</span> {tournament.name?.split(' ').slice(1).join(' ')}
                    </h1>
                    {/* View Indicator */}
                    <div className="text-[10px] text-cyan-400 font-bold tracking-[0.3em] uppercase mt-1">
                        {viewMode === 'ranking' ? 'Ranking General' : viewMode === 'matches' ? 'En Juego' : 'Fase Final'}
                    </div>
                </div>

                <div className="flex items-center h-full gap-4">
                    {/* Rules Mini-Display */}
                    <div className="hidden xl:flex items-center gap-4 text-xs font-bold text-slate-300 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                        {!tournament.use_handicap && (
                            <>
                                <span className="text-yellow-500">META: <span className="text-white text-base">{viewMode === 'groups' ? tournament.group_points_limit || '-' : tournament.playoff_points_limit || '-'}</span></span>
                                <div className="w-px h-3 bg-white/20"></div>
                                <span className="text-yellow-500">MAX: <span className="text-white text-base">{viewMode === 'groups' ? tournament.group_innings_limit || '-' : tournament.playoff_innings_limit || '-'}</span></span>
                                <div className="w-px h-3 bg-white/20"></div>
                            </>
                        )}
                        <span className="text-yellow-500">RELOJ: <span className="text-white text-base">{tournament.shot_clock_seconds || 40}</span></span>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT (82% Height) --- */}
            <div className="h-[82%] w-full flex py-2 gap-2 relative z-10 transition-opacity duration-1000 ease-in-out">

                {/* MODE: RANKING */}
                {viewMode === 'ranking' && (
                    <div className="w-full h-full rounded-lg border-2 border-cyan-900/40 overflow-hidden shadow-2xl bg-[#0a192f] animate-in fade-in zoom-in-95 duration-500">
                        <GeneralTableModule standings={globalStandings} />
                    </div>
                )}

                {/* MODE: MATCHES */}
                {viewMode === 'matches' && (
                    <div className="w-full h-full rounded-lg border-2 border-cyan-900/40 overflow-hidden shadow-2xl bg-[#0a192f] animate-in fade-in zoom-in-95 duration-500">
                        <TVMatchesModule matches={displayMatches} />
                    </div>
                )}

                {/* MODE: BRACKET */}
                {viewMode === 'bracket' && (
                    <div className="w-full h-full rounded-lg border-2 border-cyan-900/40 overflow-hidden shadow-2xl bg-[#0a192f] animate-in fade-in zoom-in-95 duration-500">
                        <BracketModule matches={matches} phases={phases} />
                    </div>
                )}
            </div>

            {/* --- FOOTER (10% Height) --- */}
            <footer className="h-[10%] shrink-0 bg-[#061020] border-t-4 border-yellow-600 flex relative z-20 rounded-b-lg overflow-hidden">

                {/* Panel Records */}
                <div className="w-[25%] bg-[#0a192f] border-r border-white/10 p-1 flex items-center justify-between gap-1 text-right">
                    <div className="flex-1 flex flex-col justify-center items-end border-r border-white/10 pr-2 h-full">
                        <span className="text-[9px] text-cyan-400 font-bold uppercase leading-none mb-0.5">Mejor Promedio</span>
                        <span className="text-yellow-400 font-bold text-xl lg:text-2xl leading-none block">{bestPlayer?.generalAvg || '0.000'}</span>
                        <span className="text-[8px] text-white uppercase truncate max-w-full">{bestPlayer?.name?.split(' ').pop()}</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center items-end pl-1 h-full">
                        <span className="text-[9px] text-cyan-400 font-bold uppercase leading-none mb-0.5">Mayor Serie</span>
                        <span className="text-white font-bold text-xl lg:text-2xl leading-none block">{recordRun}</span>
                        <span className="text-[8px] text-slate-400 uppercase">Récord</span>
                    </div>
                </div>

                {/* Promo */}
                <div className="flex-1 flex flex-col items-center justify-center bg-black relative overflow-hidden px-2">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    {champion && champion.photo_url && (
                        <div className="absolute inset-0 z-0 opacity-40">
                            <img src={champion.photo_url} alt="Winner" className="w-full h-full object-cover object-top" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                        </div>
                    )}
                    <div className="text-center z-10 w-full">
                        <h3 className="text-yellow-500 font-black text-2xl lg:text-3xl uppercase tracking-[0.1em] animate-pulse truncate drop-shadow-lg leading-none">
                            {tournament.footer_center_title || (champion ? `¡CAMPEÓN: ${champion.player_name.toUpperCase()}!` : 'GRAN FINAL')}
                        </h3>
                        <p className="text-white text-xs lg:text-base font-bold uppercase tracking-[0.3em] mt-1 text-shadow-sm leading-none relative">
                            {tournament.footer_info_text || 'ENTRADA LIBERADA • SALON PRINCIPAL'}
                        </p>
                    </div>
                </div>

                {/* Branding */}
                <div className="w-[30%] bg-[#0a192f] border-l border-white/10 flex items-center justify-around p-1 relative overflow-hidden group">
                    {/* Glow effect background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-yellow-500/5 opacity-50"></div>

                    {/* Club Sede Logo */}
                    {tournament.host_club_logo_url && (
                        <div className="flex flex-col items-center justify-center h-full max-w-[45%] z-10">
                            <span className="text-[7px] text-yellow-500/80 font-black uppercase tracking-wider mb-1">Club Sede</span>
                            <div className="h-[60%] w-full flex items-center justify-center mb-1">
                                <img src={tournament.host_club_logo_url} alt="Club Logo" className="h-full w-auto object-contain drop-shadow-md" />
                            </div>
                            <div className="text-[8px] text-white font-bold uppercase leading-none text-center">
                                {tournament.host_club_city || 'SANTIAGO'}
                                <span className="mx-1 text-slate-500">-</span>
                                <span className="text-slate-400">{tournament.host_club_country || 'CHILE'}</span>
                            </div>
                        </div>
                    )}

                    {/* Divider if both exist */}
                    {tournament.host_club_logo_url && tournament.branding_image_url && (
                        <div className="w-px h-[50%] bg-gradient-to-b from-transparent via-white/10 to-transparent z-10"></div>
                    )}

                    {/* Patronador / Branding Logo */}
                    {tournament.branding_image_url ? (
                        <div className="flex flex-col items-center justify-center h-full max-w-[45%] z-10">
                            <span className="text-[7px] text-yellow-500/80 font-black uppercase tracking-wider mb-1">Patrocinador</span>
                            <div className="h-[60%] w-full flex items-center justify-center">
                                <img src={tournament.branding_image_url} alt="Sponsor Logo" className="h-full w-auto object-contain drop-shadow-md" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center z-10 h-full">
                            <img src="/Logo3DAzul.png" alt="FECHILLAR" className="h-[60%] w-auto object-contain mb-1 opacity-80" />
                            <div className="text-white font-black text-[8px] uppercase text-center leading-tight tracking-[0.2em]">
                                {tournament.footer_branding_title || 'Torneo Oficial'}<br />
                                <span className="text-yellow-500">{tournament.footer_branding_subtitle || 'FECHILLAR'}</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="absolute bottom-0.5 right-1 opacity-50 z-10">
                        <div className="text-[6px] text-slate-500 font-bold leading-none italic">Dev by Rodrigo Zúñiga</div>
                    </div>
                </div>
            </footer >
        </div >
    );
}

function Clock() { return null; }
