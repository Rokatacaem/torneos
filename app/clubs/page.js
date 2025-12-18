import { getClubs } from '@/app/lib/tournament-actions';
import Link from 'next/link';
import { MapPin, Users, ArrowLeft, ArrowRight } from 'lucide-react';

export default async function PublicClubsPage() {
    const clubs = await getClubs();

    return (
        <div className="min-h-screen bg-[#0B1120] text-white">
            {/* Header */}
            <header className="border-b border-white/5 bg-[#0B1120]/95 backdrop-blur sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center gap-6">
                    <Link href="/" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition text-slate-400 hover:text-white">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Clubes Federados</h1>
                        <p className="text-sm text-slate-400">Directorio oficial de sedes deportivas</p>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">

                {/* Intro */}
                <div className="mb-12 max-w-2xl">
                    <h2 className="text-3xl font-bold mb-4">Encuentra tu lugar de juego</h2>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        La Federación cuenta con clubes afiliados a lo largo de todo el país.
                        Revisa el listado oficial, conoce sus instalaciones y contáctalos para unirte.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clubs.map((club) => (
                        <div key={club.id} className="group bg-[#111827] border border-white/5 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all hover:shadow-2xl hover:shadow-blue-900/10">

                            {/* Banner / Header */}
                            <div className="h-32 bg-gradient-to-br from-slate-800 to-slate-900 relative p-6 flex flex-col justify-end">
                                <div className="absolute top-4 right-4 p-2 bg-white/5 rounded-lg backdrop-blur text-white/50 group-hover:text-blue-400 transition-colors">
                                    <MapPin size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                                    {club.name}
                                </h3>
                                <div className="text-sm text-slate-400 font-medium flex items-center gap-2">
                                    {club.short_name && <span className="opacity-75">{club.short_name} •</span>}
                                    {club.city || 'Ciudad no registrada'}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <div className="space-y-4 mb-6">
                                    <div className="flex items-start gap-3 text-sm text-slate-400">
                                        <MapPin className="w-4 h-4 mt-1 text-slate-500" />
                                        <span>{club.address || 'Dirección no disponible'}</span>
                                    </div>

                                    {/* Tables Stats */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/5 rounded-lg p-2.5 text-center">
                                            <div className="text-xl font-bold text-white">
                                                {club.tables_billar || 0}
                                            </div>
                                            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                                Billar
                                            </div>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2.5 text-center">
                                            <div className="text-xl font-bold text-white">
                                                {club.tables_pool || 0}
                                            </div>
                                            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                                Pool
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button className="w-full py-3 rounded-lg bg-blue-600/10 text-blue-500 font-bold text-sm hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2">
                                    Ver Detalles
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Empty State */}
                    {clubs.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-white/10 rounded-xl">
                            No hay clubes registrados en el sistema.
                        </div>
                    )}
                </div>
            </main>
            <footer className="mt-auto py-8 text-center text-sm text-slate-600 border-t border-white/5 bg-[#0B1120]">
                &copy; {new Date().getFullYear()} Sistema Fechillar. Desarrollado por Roberto.
            </footer>
        </div>
    );
}

// Ensure fresh data
export const dynamic = 'force-dynamic';
