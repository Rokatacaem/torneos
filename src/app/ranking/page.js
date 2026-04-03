import { getGlobalRanking } from '@/app/lib/tournament-actions';
import Link from 'next/link';
import { Trophy, ArrowLeft } from 'lucide-react';
import RankingTable from './RankingTable';

export default async function PublicRankingPage() {
    const ranking = await getGlobalRanking();

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-[#0B1120] border-b border-white/10 p-6 md:p-8">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white"
                        >
                            <ArrowLeft size={20} />
                            <span className="font-medium hidden md:inline">Volver a Inicio</span>
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
                <RankingTable initialRanking={ranking} />
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
