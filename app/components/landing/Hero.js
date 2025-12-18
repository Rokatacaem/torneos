import Link from 'next/link';
import { Trophy, ArrowRight, Calendar } from 'lucide-react';

export default function Hero() {
    return (
        <div className="relative overflow-hidden bg-[#0B1120] border-b border-white/5">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-[#0B1120] to-[#0B1120] z-0" />

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 z-0"></div>

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center">

                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8 animate-fade-in-up">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Sitio Oficial Federación Chilena de Billar
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-7xl font-bold tracking-tight text-white mb-6">
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                        Pasión, Precisión
                    </span>
                    <span className="block text-blue-500">
                        y Competencia
                    </span>
                </h1>

                {/* Description */}
                <p className="max-w-2xl text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
                    La plataforma central para el desarrollo del billar en Chile.
                    Consulta rankings oficiales, inscríbete a torneos y sigue los resultados en tiempo real.
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Link
                        href="/tournaments"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40"
                    >
                        <Calendar size={20} />
                        Calendario 2025
                    </Link>
                    <Link
                        href="/ranking"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#1A2333] hover:bg-[#232D3F] text-white border border-white/10 rounded-lg font-bold transition-all"
                    >
                        <Trophy size={20} />
                        Ver Ranking Nacional
                    </Link>
                </div>

            </div>
        </div>
    );
}
