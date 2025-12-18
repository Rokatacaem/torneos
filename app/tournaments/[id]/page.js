import { getTournament, getTournamentPlayers, getMatches } from '@/app/lib/tournament-actions';
import TVDashboard from '@/app/components/tournaments/TVDashboard';

export default async function PublicTournamentDetailPage({ params }) {
    const { id } = await params;
    const tournament = await getTournament(id);
    const matches = await getMatches(id);
    const players = await getTournamentPlayers(id);

    if (!tournament) return <div className="text-white bg-black h-screen flex items-center justify-center">Torneo no encontrado</div>;

    // Directamente renderizar el Dashboard de TV
    return (
        <TVDashboard
            tournament={tournament}
            matches={matches}
            players={players}
        />
    );
}
