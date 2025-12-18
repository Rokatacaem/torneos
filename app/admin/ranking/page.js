import { getGlobalRanking } from '@/app/lib/tournament-actions';
import { calculateFechillarHandicap } from '@/app/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Trophy, TrendingUp } from 'lucide-react';

import ExportRankingButton from '@/app/components/admin/ExportRankingButton';
import RecalculateButton from '@/app/components/admin/RecalculateButton'; // New

export default async function RankingPage() {
    const ranking = await getGlobalRanking();

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/10 rounded-full text-yellow-500">
                        <Trophy size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Ranking Nacional</h1>
                        <p className="text-muted-foreground">Clasificación oficial FECHILLAR</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <RecalculateButton />
                    <ExportRankingButton />
                </div>
            </div>

            <Card className="bg-[#0B1120] border-white/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="text-blue-500" />
                        Tabla General
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white/5 text-slate-300 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-4 py-3 text-center w-12">#</th>
                                    <th className="px-4 py-3 text-center w-12">Cat</th>
                                    <th className="px-4 py-3">Jugador</th>
                                    <th className="px-4 py-3">Club</th>

                                    {/* Ranking Nacional */}
                                    <th className="px-4 py-3 text-center text-blue-400">Torneos</th>
                                    <th className="px-4 py-3 text-center text-blue-400">Pts Nacional</th>

                                    {/* Ranking Anual */}
                                    <th className="px-4 py-3 text-center text-yellow-400 border-l border-white/5">Torneos (Año)</th>
                                    <th className="px-4 py-3 text-center text-yellow-400">Pts Anual</th>

                                    <th className="px-4 py-3 text-right">Promedio</th>
                                    <th className="px-4 py-3 text-center">HCP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {ranking.map((p, index) => {
                                    const avg = p.average || 0;
                                    const hcp = calculateFechillarHandicap(avg);

                                    // National
                                    const pointsNational = p.ranking || 0;
                                    const playedNational = p.tournaments_played || 0;
                                    const category = p.category || 'C';

                                    // Annual
                                    const pointsAnnual = p.ranking_annual || 0;
                                    const playedAnnual = p.tournaments_played_annual || 0;

                                    return (
                                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-500">
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`
                                                    font-bold px-2 py-0.5 rounded text-xs
                                                    ${category === 'A' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' :
                                                        category === 'B' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/50' :
                                                            'text-slate-500'}
                                                `}>
                                                    {category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-white">
                                                {p.name}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400">
                                                {p.club_name || <span className="text-slate-600">-</span>}
                                            </td>

                                            {/* National Stats */}
                                            <td className="px-4 py-3 text-center text-slate-400">
                                                {playedNational}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-blue-400">
                                                {pointsNational}
                                            </td>

                                            {/* Annual Stats */}
                                            <td className="px-4 py-3 text-center text-slate-400 border-l border-white/5">
                                                {playedAnnual}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-yellow-500">
                                                {pointsAnnual}
                                            </td>

                                            <td className="px-4 py-3 text-right font-mono text-slate-400">
                                                {avg.toFixed(3)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`
                                                    px-2 py-1 rounded text-xs font-bold
                                                    ${hcp >= 28 ? 'bg-red-500/20 text-red-500' :
                                                        hcp >= 24 ? 'bg-orange-500/20 text-orange-500' :
                                                            'bg-green-500/20 text-green-500'}
                                                `}>
                                                    {hcp}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {ranking.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="text-center py-8 text-muted-foreground">
                                            No hay datos de ranking disponibles.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

