import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import { getTournament, getTournamentPlayers, getMatches, getClubs } from '@/app/lib/tournament-actions';
import TournamentManager from '@/app/components/tournaments/TournamentManager';
import PublicTournamentView from '@/app/components/tournaments/PublicTournamentView';

export const dynamic = 'force-dynamic';

export default async function AdminTournamentDetailPage({ params }) {
    const { id } = await params;
    const tournament = await getTournament(id);
    const matches = await getMatches(id);
    const players = await getTournamentPlayers(id);
    const clubs = await getClubs();

    if (!tournament) return <div>Torneo no encontrado</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{tournament.name}</h1>
                <div className="flex flex-wrap gap-2 md:gap-4 items-center">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium uppercase">
                        {tournament.status}
                    </span>
                    <Link
                        href={`/admin/tournaments/${tournament.id}/edit`}
                        className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-2 md:px-4 md:py-2 rounded-md transition-colors font-medium text-xs md:text-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                        Editar
                    </Link>
                    <Link
                        href={`/admin/tournaments/${tournament.id}/manage`}
                        className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 md:px-4 md:py-2 rounded-md hover:bg-secondary/80 transition-colors text-xs md:text-sm"
                    >
                        <Settings2 size={16} className="md:w-5 md:h-5" />
                        Gestionar
                    </Link>
                    <a
                        href={`/tournaments/${tournament.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 md:px-4 md:py-2 rounded-md font-bold text-xs md:text-sm shadow-md transition-all active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" /></svg>
                        TV
                    </a>
                </div>
            </div>

            {/* Manager Component (Registration, Results) */}
            <TournamentManager
                tournament={tournament}
                players={players}
                matches={matches}
                clubs={clubs}
            />

            <div className="bg-card border border-white/5 rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-4 text-white">Vista Previa Pública</h2>
                <PublicTournamentView tournament={tournament} matches={matches} players={players} />
            </div>
        </div >
    );
}
