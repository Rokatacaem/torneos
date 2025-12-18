import { getClub, getPlayersByClub } from '@/app/lib/tournament-actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, ArrowLeft, Trophy, Users, Info, Calendar } from 'lucide-react';
import { calculateFechillarHandicap } from '@/app/lib/utils';

export default async function ClubDetailPage({ params }) {
    const { id } = await params;
    const club = await getClub(id);

    if (!club) {
        notFound();
    }

    const players = await getPlayersByClub(id);

    // Calc Stats
    const totalPlayers = players.length;
    const averageHcp = totalPlayers > 0
        ? Math.round(players.reduce((acc, curr) => acc + (calculateFechillarHandicap(curr.average || 0)), 0) / totalPlayers)
        : 0;

    return (
        <div className="min-h-screen bg-[#0B1120] text-white">
            {/* Header / Banner */}
            <div className="relative h-64 bg-slate-900 border-b border-white/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] to-transparent z-10"></div>

                {/* Placeholder pattern/image if no banner */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-slate-950"></div>

                <div className="max-w-7xl mx-auto px-6 h-full flex items-end relative z-20 pb-8">
                    <div className="flex flex-col md:flex-row md:items-end gap-6 w-full">
                        {/* Logo Placeholder */}
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-2xl border-4 border-[#0B1120]">
                            <span className="text-3xl font-bold text-white">{club.short_name || club.name.substring(0, 2).toUpperCase()}</span>
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-3 text-blue-400 mb-2 font-medium bg-blue-500/10 px-3 py-1 rounded-full w-fit text-sm">
                                <MapPin size={16} />
                                {club.city || 'Ciudad no registrada'}
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight mb-2">{club.name}</h1>
                            <p className="text-slate-400 max-w-2xl text-lg flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Club Federado Activo
                            </p>
                        </div>

                        <Link
                            href="/"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white"
                        >
                            <ArrowLeft size={20} />
                            <span className="font-medium">Volver a Inicio</span>
                        </Link>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Info */}
                <div className="space-y-6">
                    <div className="bg-[#111827] border border-white/5 rounded-2xl p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Info size={20} className="text-blue-500" />
                            Información
                        </h3>
                        <div className="space-y-4 text-sm text-slate-300">
                            <div>
                                <span className="block text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Dirección</span>
                                {club.address || 'No registrada'}
                            </div>
                            <div>
                                <span className="block text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Mesas</span>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="bg-white/5 p-2 rounded text-center">
                                        <div className="font-bold text-lg text-white">{club.tables_billar || 0}</div>
                                        <div className="text-[10px] text-slate-500">Billar</div>
                                    </div>
                                    <div className="bg-white/5 p-2 rounded text-center">
                                        <div className="font-bold text-lg text-white">{club.tables_pool || 0}</div>
                                        <div className="text-[10px] text-slate-500">Pool</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#111827] border border-white/5 rounded-2xl p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Trophy size={20} className="text-yellow-500" />
                            Estadísticas
                        </h3>
                        <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                            <span className="text-slate-400">Jugadores Federados</span>
                            <span className="font-bold text-white">{totalPlayers}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 text-sm">
                            <span className="text-slate-400">Handicap Promedio</span>
                            <span className="font-bold text-white">{averageHcp}</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Players */}
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <Users className="text-purple-500" />
                        Jugadores Destacados
                    </h2>

                    <div className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white/5 text-slate-400 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4">Jugador</th>
                                        <th className="px-6 py-4 text-center">Ranking</th>
                                        <th className="px-6 py-4 text-center">Categoría</th>
                                        <th className="px-6 py-4 text-right">Promedio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {players.map((player) => (
                                        <tr key={player.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">
                                                {player.name}
                                                {player.ranking <= 10 && player.ranking > 0 && (
                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                                        TOP 10
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-blue-400">
                                                {player.ranking > 0 ? `#${player.ranking}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`
                                                    px-2 py-1 rounded text-[10px] font-bold
                                                    ${player.category === 'A' ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-700 text-slate-400'}
                                                `}>
                                                    {player.category || 'C'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-slate-400">
                                                {Number(player.average || 0).toFixed(3)}
                                            </td>
                                        </tr>
                                    ))}
                                    {players.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                                No hay jugadores registrados en este club aún.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}

export const dynamic = 'force-dynamic';
