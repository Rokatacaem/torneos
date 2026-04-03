import { Info } from "lucide-react";

export default function TournamentGraphicsGuide() {
    return (
        <div className="border border-blue-500/30 bg-blue-500/5 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Info size={18} />
                <h3 className="font-bold text-sm uppercase tracking-wide">Guía de Gráficas para TV Dashboard</h3>
            </div>

            {/* Visual Schema */}
            <div className="relative w-full aspect-video bg-[#040e1a] rounded border border-slate-700 overflow-hidden shadow-lg select-none">

                {/* 1. Header Area (10%) */}
                <div className="absolute top-0 left-0 w-full h-[15%] bg-yellow-600/20 border-b border-yellow-600/50 flex items-center justify-center">
                    <span className="text-[10px] text-yellow-500 font-mono bg-black/50 px-1 rounded">Banner: 1920x200px</span>
                </div>

                {/* 2. Logo Area */}
                <div className="absolute top-[2%] left-[2%] h-[11%] aspect-square rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center z-10">
                    <span className="text-[8px] text-white font-mono text-center leading-none">Logo<br />500px²</span>
                </div>

                {/* 3. Title Placeholder */}
                <div className="absolute top-[4%] left-[15%] text-slate-600 font-black text-xs uppercase tracking-widest">
                    NOMBRE TORNEO
                </div>

                {/* 4. Footer Placeholder (Hardcoded) */}
                <div className="absolute bottom-0 w-full h-[12%] border-t border-yellow-600/30 flex">
                    <div className="w-[20%] border-r border-white/10 bg-[#0a192f]"></div>
                    <div className="flex-1 bg-black/40 flex flex-col items-center justify-center gap-0.5">
                        <span className="text-[6px] text-yellow-500 font-bold uppercase">Título Central</span>
                        <span className="text-[6px] text-slate-300 uppercase">Texto Informativo</span>
                    </div>
                    <div className="w-[20%] bg-white flex flex-col items-center justify-center">
                        <span className="text-[6px] text-black font-bold text-center leading-tight">Título<br />Branding</span>
                    </div>
                </div>

                {/* Dimensions Lines */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* Arrows or lines could go here */}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
                <div>
                    <strong className="text-white block mb-1">Banner Superior</strong>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Tamaño: <strong>1920 x 200 px</strong></li>
                        <li>Se oscurece al 30% autom.</li>
                        <li>Usar texturas o degradados.</li>
                    </ul>
                </div>
                <div>
                    <strong className="text-white block mb-1">Logo del Torneo</strong>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Tamaño: <strong>500 x 500 px</strong></li>
                        <li>Formato: <strong>PNG Transparente</strong></li>
                        <li>Se muestra circular.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
