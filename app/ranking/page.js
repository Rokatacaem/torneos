import { getGlobalRanking } from '@/app/lib/tournament-actions';
import { calculateFechillarHandicap } from '@/app/lib/utils';
import Link from 'next/link';
import { Trophy, ArrowLeft, Info, ArrowRight } from 'lucide-react';

export default async function PublicRankingPage() {
    const ranking = await getGlobalRanking();

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-[#0B1120] border-b border-white/10 p-6 md:p-8">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition text-slate-400 hover:text-white">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                                <Trophy className="text-yellow-500" />
                                Ranking Nacional
                            </h1>
                            <p className="text-slate-400 mt-1">
                                Federación Chilena de Billar
                            </p>
                        </div>
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-lg">
                        {/* Disicpline toggle placeholder */}
                        <span className="px-4 py-1.5 bg-blue-600 text-white rounded font-medium text-sm border border-blue-500 shadow-lg shadow-blue-500/20">
                            Billar 3 Bandas
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-4 md:p-8">

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-[#1A2333] border border-white/5 rounded-xl p-5 flex items-start gap-4 shadow-lg">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 mt-1">
                            <Info size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white mb-1">Ranking Nacional (12 Meses)</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Clasificación oficial basada en los resultados de los últimos 12 meses.
                                Define la categoría del jugador:
                            </p>
                            <div className="flex gap-2 mt-3">
                                <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded font-bold">Cat A: Top 5 mejores</span>
                                <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded font-bold">Cat B/C: Suma Total</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#1A2333] border border-white/5 rounded-xl p-5 flex items-start gap-4 shadow-lg">
                        <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500 mt-1">
                            <Trophy size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white mb-1">Carrera Anual {new Date().getFullYear()}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Acumulación de puntos del año en curso.
                                define los clasificados a la <strong>Qualy Final</strong>.
                            </p>
                            <div className="mt-3 text-xs text-yellow-400 font-medium">
                                ¡Cada torneo cuenta para la gran final!
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Table */}
                <div className="bg-[#111827] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#0f1623] text-slate-400 uppercase text-xs font-bold border-b border-white/5">
                                <tr>
                                    <th className="px-5 py-4 text-center w-12">#</th>
                                    <th className="px-5 py-4 text-center w-12">Cat</th>
                                    <th className="px-5 py-4">Jugador</th>
                                    <th className="px-5 py-4">Club</th>

                                    {/* Ranking Nacional */}
                                    <th className="px-5 py-4 text-center bg-blue-500/5 text-blue-400 border-l border-white/5">
                                        <div className="flex flex-col">
                                            <span>Nacional</span>
                                            <span className="text-[10px] opacity-60 normal-case font-normal">Puntos</span>
                                        </div>
                                    </th>

                                    {/* Ranking Anual */}
                                    <th className="px-5 py-4 text-center bg-yellow-500/5 text-yellow-400 border-l border-white/5">
                                        <div className="flex flex-col">
                                            <span>Anual</span>
                                            <span className="text-[10px] opacity-60 normal-case font-normal">Puntos</span>
                                        </div>
                                    </th>

                                    <th className="px-5 py-4 text-center border-l border-white/5 hidden lg:table-cell text-xs opacity-60">Torneos</th>
                                    <th className="px-5 py-4 text-center border-l border-white/5 hidden lg:table-cell text-xs opacity-60">Carambolas</th>
                                    <th className="px-5 py-4 text-center border-l border-white/5 hidden lg:table-cell text-xs opacity-60">Entradas</th>

                                    <th className="px-5 py-4 text-center border-l border-white/5 hidden md:table-cell">HCP</th>
                                    <th className="px-5 py-4 text-right hidden md:table-cell">Promedio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {ranking.map((p, index) => {
                                    const avg = p.average || 0;
                                    const hcp = calculateFechillarHandicap(avg);

                                    // National
                                    const pointsNational = p.ranking || 0;
                                    const category = p.category || 'C';

                                    // Annual
                                    const pointsAnnual = p.ranking_annual || 0;

                                    return (
                                        <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-5 py-4 text-center font-mono font-bold text-slate-500 group-hover:text-white transition-colors">
                                                {index + 1}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`
                                                    font-bold px-2.5 py-1 rounded text-[11px]
                                                    ${category === 'A' ? 'bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/20' :
                                                        category === 'B' ? 'bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20' :
                                                            'text-slate-500 ring-1 ring-slate-500/20'}
                                                `}>
                                                    {category}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-white text-base">
                                                    {p.name}
                                                </div>
                                                <div className="text-xs text-slate-500 md:hidden mt-0.5">
                                                    {p.club_name || '-'} • HCP: {hcp}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-slate-400 text-sm hidden md:table-cell">
                                                {p.club_name || <span className="opacity-50">-</span>}
                                            </td>

                                            {/* National Stats */}
                                            <td className="px-5 py-4 text-center font-bold text-blue-400 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors border-l border-white/5 text-base">
                                                {pointsNational}
                                            </td>

                                            {/* Annual Stats */}
                                            <td className="px-5 py-4 text-center font-bold text-yellow-500 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors border-l border-white/5 text-base">
                                                {pointsAnnual}
                                            </td>

                                            {/* New Stats Columns */}
                                            <td className="px-5 py-4 text-center border-l border-white/5 hidden lg:table-cell text-slate-400">
                                                {p.tournaments_played || 0}
                                            </td>
                                            <td className="px-5 py-4 text-center border-l border-white/5 hidden lg:table-cell text-slate-400">
                                                {p.total_carambolas || 0}
                                            </td>
                                            <td className="px-5 py-4 text-center border-l border-white/5 hidden lg:table-cell text-slate-400">
                                                {p.total_innings || 0}
                                            </td>

                                            <td className="px-5 py-4 text-center border-l border-white/5 hidden md:table-cell">
                                                <span className={`
                                                    font-mono font-bold
                                                    ${hcp >= 28 ? 'text-red-400' :
                                                        hcp >= 24 ? 'text-orange-400' :
                                                            'text-green-400'}
                                                `}>
                                                    {p.handicap || hcp}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right font-mono text-slate-500 hidden md:table-cell">
                                                {p.average ? Number(p.average).toFixed(3) : avg.toFixed(3)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {ranking.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="text-center py-12 text-slate-500">
                                            No hay datos de ranking disponibles.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <Link
                        href="/tournaments"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                        Ver Calendario de Torneos <ArrowRight size={18} />
                    </Link>
                </div>
            </main>

            <footer className="mt-auto py-8 text-center text-sm text-slate-600 border-t border-white/5 bg-[#0B1120]">
                &copy; {new Date().getFullYear()} Sistema Fechillar. Desarrollado por Roberto.
            </footer>
        </div>
    );
}

// Disable caching for live data or use revalidate?
// Using 'force-dynamic' might be safer for "Live" feeling updates if users check often.
export const dynamic = 'force-dynamic';
