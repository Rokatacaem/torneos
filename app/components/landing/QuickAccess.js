import Link from 'next/link';
import { Trophy, Calendar, Users, FileText, ArrowRight } from 'lucide-react';

export default function QuickAccess() {
    const items = [
        {
            title: "Ranking Oficial",
            description: "Revisa la posición nacional y carrera anual.",
            icon: <Trophy className="w-8 h-8 text-yellow-500" />,
            href: "/ranking",
            color: "border-yellow-500/20 hover:border-yellow-500/50"
        },
        {
            title: "Próximos Torneos",
            description: "Inscripciones abiertas y programación.",
            icon: <Calendar className="w-8 h-8 text-blue-500" />,
            href: "/tournaments",
            color: "border-blue-500/20 hover:border-blue-500/50"
        },
        {
            title: "Clubes Federados",
            description: "Encuentra dónde jugar cerca de ti.",
            icon: <Users className="w-8 h-8 text-green-500" />,
            href: "/clubs", // Placeholder route
            color: "border-green-500/20 hover:border-green-500/50"
        },
        {
            title: "Reglamentos",
            description: "Normativa oficial de juego 2024-2025.",
            icon: <FileText className="w-8 h-8 text-slate-400" />,
            href: "#", // Placeholder
            color: "border-slate-500/20 hover:border-slate-500/50"
        }
    ];

    return (
        <section className="py-16 bg-[#0B1120] relative z-10">
            <div className="max-w-6xl mx-auto px-6">
                <h2 className="text-2xl font-bold text-white mb-8">Accesos Directos</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {items.map((item, index) => (
                        <Link
                            key={index}
                            href={item.href}
                            className={`
                group bg-[#111827] border ${item.color} 
                p-6 rounded-xl transition-all hover:-translate-y-1 hover:shadow-xl
              `}
                        >
                            <div className="mb-4 p-3 bg-white/5 w-fit rounded-lg group-hover:scale-110 transition-transform">
                                {item.icon}
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                {item.title}
                                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </h3>
                            <p className="text-sm text-slate-400">
                                {item.description}
                            </p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
