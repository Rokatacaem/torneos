import Link from 'next/link';
import { getClubs } from '@/app/lib/tournament-actions';
import { MapPin, ArrowRight } from 'lucide-react';

export default async function ClubsSection() {
    const clubs = await getClubs();
    // Show only first 6 clubs for the landing page to avoid clutter
    const displayClubs = clubs.slice(0, 6);

    return (
        <section className="py-20 bg-[#0B1120] relative border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-end justify-between mb-12">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-4">Nuestros Clubes</h2>
                        <p className="text-slate-400 max-w-2xl text-lg">
                            La Federación reúne a las mejores sedes deportivas del país.
                            Encuentra tu club más cercano y únete a la comunidad.
                        </p>
                    </div>
                    <Link
                        href="/clubs"
                        className="hidden md:flex items-center gap-2 text-blue-500 font-medium hover:text-blue-400 transition-colors"
                    >
                        Ver todos los clubes <ArrowRight size={20} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {displayClubs.map((club) => (
                        <div key={club.id} className="group bg-[#111827] border border-white/5 rounded-2xl p-6 hover:border-blue-500/30 transition-all hover:shadow-2xl hover:shadow-blue-900/10">
                            <div className="flex items-start justify-between mb-6">
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                    <MapPin size={24} />
                                </div>
                                {club.short_name && (
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-white/5 text-slate-400">
                                        {club.short_name}
                                    </span>
                                )}
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                                {club.name}
                            </h3>

                            <p className="text-slate-400 text-sm mb-6 flex items-center gap-2">
                                {club.city || 'Ciudad no registrada'}
                                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                <span className="truncate max-w-[150px]">{club.address || 'Dirección no disponible'}</span>
                            </p>

                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                                <div className="text-center">
                                    <div className="text-xl font-bold text-white mb-1">{club.tables_billar || 0}</div>
                                    <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Billar</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xl font-bold text-white mb-1">{club.tables_pool || 0}</div>
                                    <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Pool</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center md:hidden">
                    <Link
                        href="/clubs"
                        className="inline-flex items-center gap-2 text-blue-500 font-bold hover:text-blue-400 transition-colors"
                    >
                        Ver todos los clubes <ArrowRight size={20} />
                    </Link>
                </div>
            </div>
        </section>
    );
}
