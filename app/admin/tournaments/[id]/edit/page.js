import { getTournament } from '@/app/lib/tournament-actions';
import EditTournamentForm from './EditTournamentForm';

export default async function EditTournamentPage({ params }) {
    // Await params in Next.js 15
    const { id } = await params;

    try {
        const tournament = await getTournament(id);

        if (!tournament) {
            return (
                <div className="p-8 text-red-500 flex flex-col items-center gap-4">
                    <h2 className="text-2xl font-bold">Torneo no encontrado</h2>
                    <p>El ID proporcionado ({id}) no existe.</p>
                </div>
            );
        }

        return <EditTournamentForm tournament={tournament} />;
    } catch (error) {
        return (
            <div className="p-8 text-red-500 flex flex-col items-center gap-4">
                <h2 className="text-2xl font-bold">Error al Cargar</h2>
                <p className="text-sm bg-black/10 p-4 rounded">{error.message}</p>
                <code className="text-xs">{error.stack}</code>
            </div>
        );
    }
}
