import { getGlobalPlayers, getClubs } from '@/app/lib/tournament-actions';
import PlayerDirectory from '@/app/components/admin/PlayerDirectory';

export const dynamic = 'force-dynamic';

export default async function AdminPlayersPage() {
    const players = await getGlobalPlayers();
    const clubs = await getClubs();

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Directorio Global de Jugadores</h1>
            <PlayerDirectory initialPlayers={players} clubs={clubs} />
        </div>
    );
}
