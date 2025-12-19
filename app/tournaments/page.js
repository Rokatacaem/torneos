import Link from 'next/link';
import { getTournaments, getMatches, getTournamentPlayers } from '@/app/lib/tournament-actions';
import { formatDate } from '@/app/lib/utils';
import { Trophy, Calendar, ArrowLeft } from 'lucide-react';
import TVDashboard from '@/app/components/tournaments/TVDashboard';

export const dynamic = 'force-dynamic';

export default async function PublicTournamentsPage() {
    const tournaments = await getTournaments();

    // 1. Detectar si hay un torneo ACTIVO o FINALIZADO RECIENTE
    // Estrategia Agresiva: Siempre mostrar dashboard del último torneo relevante.

    // Sort by ID desc (assuming newer IDs are newer tournaments)
    const sortedTournaments = [...tournaments].sort((a, b) => b.id - a.id);

    // Priority 1: Status = 'active'
    let targetTournament = sortedTournaments.find(t => t.status === 'active');

    // Priority 2: Status = 'completed' (The latest one)
    if (!targetTournament) {
        targetTournament = sortedTournaments.find(t => t.status === 'completed');
    }

    // Force Dashboard if we found ANY target tournament
    if (targetTournament) {
        // Obtenemos matches para validar si vale la pena mostrar dashboard
        const matches = await getMatches(targetTournament.id);
        const players = await getTournamentPlayers(targetTournament.id);

        // Si tiene partidos, asumimos que es digno de TV Dashboard (sea activo o finalizado)
        if (matches.length > 0) {
            return (
                <TVDashboard
                    tournament={targetTournament}
                    matches={matches}
                    players={players}
                />
            );
        }
    }

    // 2. Fallback: Si realmente no hay nada (ni activo ni completado), mostrar lista vacía o mensaje
    if (!targetTournament) {
        return (
            <div className="container py-8 text-center">
                <h1 className="text-3xl font-bold mb-8">No hay torneos disponibles para TV</h1>
            </div>
        )
    }

    // This part should be unreachable if logic works, but keeping list just in case
    return (
        <div className="container py-8">
            <Link
                href="/"
                className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-lg bg-card hover:bg-accent/10 transition-colors border border-border text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft size={20} />
                <span className="font-medium">Volver a Inicio</span>
            </Link>

            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Trophy className="text-primary" size={32} />
                Torneos
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tournaments.map((t) => (
                    <Link
                        key={t.id}
                        href={`/tournaments/${t.id}`}
                        className="block group"
                    >
                        <div className="border rounded-lg bg-card hover:bg-accent/5 transition-colors p-6 h-full flex flex-col shadow-sm group-hover:shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-xl font-bold group-hover:text-primary transition-colors">{t.name}</h2>
                                <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide ${t.status === 'active' ? 'bg-primary/20 text-primary' :
                                    t.status === 'completed' ? 'bg-muted text-muted-foreground' : 'bg-yellow-500/20 text-yellow-600'
                                    }`}>
                                    {t.status === 'draft' ? 'Próximamente' : t.status === 'active' ? 'En Vivo' : 'Finalizado'}
                                </span>
                            </div>

                            <div className="space-y-2 mb-6 flex-1">
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Calendar size={16} className="mr-2" />
                                    {formatDate(t.start_date)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Formato: {
                                        {
                                            'single_elimination': 'Eliminación Directa',
                                            'double_elimination': 'Doble Eliminación',
                                            'round_robin': 'Liga (Todos contra Todos)',
                                            'swiss': 'Suizo'
                                        }[t.format] || t.format
                                    }
                                </div>
                            </div>

                            <div className="text-primary font-medium text-sm flex items-center">
                                Ver Resultados &rarr;
                            </div>
                        </div>
                    </Link>
                ))}
                {tournaments.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No hay torneos públicos en este momento.
                    </div>
                )}
            </div>
        </div>
    );
}
