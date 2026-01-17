import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Users, Trophy, Activity, Calendar } from "lucide-react";
import { getTournaments, getRecentMatches } from '@/app/lib/tournament-actions';
import { formatDate } from '@/app/lib/utils';
import SimulationControls from '@/app/components/admin/SimulationControls';

export const dynamic = 'force-dynamic';

function StatCard({ title, value, icon: Icon, description }) {
    return (
        <Card className="bg-card border-white/5 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}

export default async function AdminDashboard() {
    const tournaments = await getTournaments();
    const recentMatches = await getRecentMatches();

    // Calcular estadísticas
    const activeTournament = tournaments.find(t => t.status === 'active');
    const totalTournaments = tournaments.length;
    const activeTournamentsCount = tournaments.filter(t => t.status === 'active').length;

    // Si hay un torneo activo, asumimos 64 jugadores para la demo, o 0 si no
    const totalPlayers = activeTournament ? 64 : 0;

    const stats = {
        totalPlayers: totalPlayers,
        matchesPlayed: recentMatches.length,
        activeTournaments: activeTournamentsCount,
        days: 3 // Dato estático por ahora
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-card p-6 rounded-xl border border-white/5 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Dashboard</h1>
                    <p className="text-slate-400">Bienvenido al panel de control de Torneos Pro.</p>
                </div>
                <SimulationControls />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Jugadores Totales"
                    value={stats.totalPlayers}
                    icon={Users}
                    description="Registrados en torneo activo"
                />
                <StatCard
                    title="Partidas Recientes"
                    value={stats.matchesPlayed}
                    icon={Activity}
                    description="Últimos resultados"
                />
                <StatCard
                    title="Torneos Activos"
                    value={stats.activeTournaments}
                    icon={Trophy}
                    description={`${totalTournaments} en total`}
                />
                <StatCard
                    title="Días de Evento"
                    value={stats.days}
                    icon={Calendar}
                    description="Duración estimada"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <h3 className="font-semibold text-lg mb-4">Actividad Reciente</h3>
                    <div className="space-y-4">
                        {recentMatches.length === 0 ? (
                            <div className="text-center text-muted-foreground py-4">No hay actividad reciente</div>
                        ) : (
                            recentMatches.map((m) => (
                                <div key={m.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                            M{m.table_number || '?'}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">{m.player1_name} vs {m.player2_name}</div>
                                            <div className="text-xs text-muted-foreground">{m.tournament_name}</div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold flex gap-2">
                                        <span className={m.score_p1 > m.score_p2 ? "text-primary" : ""}>{m.score_p1}</span>
                                        -
                                        <span className={m.score_p2 > m.score_p1 ? "text-primary" : ""}>{m.score_p2}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <h3 className="font-semibold text-lg mb-4">Próximos Torneos</h3>
                    <div className="space-y-4">
                        {tournaments.slice(0, 3).map(t => (
                            <div key={t.id} className="flex items-center gap-4">
                                <Trophy className="text-yellow-500 h-5 w-5" />
                                <div className="flex-1">
                                    <div className="text-sm font-medium">{t.name}</div>
                                    <div className="text-xs text-muted-foreground">{formatDate(t.start_date)}</div>
                                </div>
                                <div className="text-xs bg-secondary px-2 py-1 rounded capitalize">
                                    {t.status}
                                </div>
                            </div>
                        ))}
                        {tournaments.length === 0 && (
                            <div className="text-sm text-muted-foreground">No hay torneos creados.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
