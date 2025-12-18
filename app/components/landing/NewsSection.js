import { Calendar } from 'lucide-react';
import Image from 'next/image';

export default function NewsSection() {
    const news = [
        {
            category: "Nacional",
            date: "15 Dic 2024",
            title: "Gran Final Ranking Nacional 2024",
            excerpt: "Los mejores 32 jugadores del país se darán cita este fin de semana en el Club Santiago.",
            image: "/news-1.jpg" // Placeholder
        },
        {
            category: "Internacional",
            date: "10 Dic 2024",
            title: "Selección Chilena viaja al Panamericano",
            excerpt: "Nuestra delegación parte rumbo a Colombia para disputar el certamen continental.",
            image: "/news-2.jpg"
        },
        {
            category: "Institucional",
            date: "05 Dic 2024",
            title: "Nuevo sistema de gestión FECHILLAR",
            excerpt: "La federación moderniza sus procesos con una nueva plataforma digital para todos sus afiliados.",
            image: "/news-3.jpg"
        }
    ];

    return (
        <section className="py-20 bg-[#0B1120] border-t border-white/5">
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Últimas Noticias</h2>
                        <p className="text-slate-400">Mantente informado de la actualidad del billar.</p>
                    </div>
                    <button className="hidden md:block px-4 py-2 text-sm text-blue-400 font-medium hover:text-blue-300 transition-colors">
                        Ver todas las noticias →
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {news.map((item, index) => (
                        <article key={index} className="group cursor-pointer">
                            <div className="relative h-48 mb-4 overflow-hidden rounded-xl bg-slate-800 border border-white/5">
                                {/* 
                  Using a colored div as placeholder if image fails or is missing.
                  In production, we would use real images.
                */}
                                <div className="absolute inset-0 bg-blue-900/20 group-hover:bg-blue-900/30 transition-colors flex items-center justify-center">
                                    <Calendar className="text-white/10 w-16 h-16" />
                                </div>
                                <div className="absolute top-3 left-3 px-2 py-1 bg-blue-600 text-[10px] font-bold text-white uppercase tracking-wider rounded">
                                    {item.category}
                                </div>
                            </div>

                            <div className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                                <Calendar size={12} />
                                {item.date}
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                                {item.title}
                            </h3>

                            <p className="text-sm text-slate-400 line-clamp-2">
                                {item.excerpt}
                            </p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
