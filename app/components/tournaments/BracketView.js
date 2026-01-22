'use client';

export default function BracketView({ matches }) {
    // 1. Organizar por rondas
    // Suponemos round_label o inferimos por cantidad
    // 8 jug -> 4tos, 4 -> Semi, 2 -> Final

    // Agrupar matches por round
    // Si no tengo rounds explicitos, los agrupo...
    // Pero en generatePlayoffs no puse round numbers explícitos, solo labels.
    // Vamos a asumir que el orden (sequence_order) o visualmente los id lo dictan.
    // Para MVP: Renderizaremos columnas Flex.

    // Filtramos solo los de eliminación de esta fase
    const rounds = {
        '4tos': matches.filter(m => m.round_label?.includes('4tos')),
        'Semis': matches.filter(m => m.round_label?.includes('Semi')),
        'Final': matches.filter(m => m.round_label?.includes('Final'))
    };

    // Si no hay labels, intentamos una heuristica simple
    // o simplemente mostramos todo
    const hasLabels = Object.values(rounds).some(arr => arr.length > 0);

    if (!hasLabels) {
        return <div className="p-4 text-center">Partidos de llave sin etiquetas de ronda.</div>;
    }

    return (
        <div className="flex justify-start md:justify-around items-start md:items-center overflow-x-auto py-4 md:py-10 gap-4 md:gap-8 w-full px-4 scrollbar-hide">
            {/* 4tos */}
            {rounds['4tos'].length > 0 && <RoundColumn title="Cuartos" matches={rounds['4tos']} />}

            {/* Semis */}
            {(rounds['4tos'].length > 0 || rounds['Semis'].length > 0) && (
                <RoundColumn title="Semifinal" matches={rounds['Semis']} placeholderCount={2} />
            )}

            {/* Final */}
            <RoundColumn title="Final" matches={rounds['Final']} placeholderCount={1} />
        </div>
    );
}

function RoundColumn({ title, matches, placeholderCount = 0 }) {
    // Rellenar con placeholders si no hay partidos creados aun
    // Por ahora solo mostramos lo que hay
    return (
        <div className="flex flex-col justify-center gap-4 md:gap-8 w-40 md:w-64 flex-shrink-0">
            <h3 className="text-center font-bold text-blue-400 uppercase tracking-widest mb-2 md:mb-4 text-xs md:text-base">{title}</h3>
            {matches.map(m => (
                <MatchCard key={m.id} match={m} />
            ))}
            {matches.length === 0 && Array.from({ length: placeholderCount }).map((_, i) => (
                <div key={i} className="border border-white/10 rounded-lg h-24 flex items-center justify-center text-white/20 text-sm border-dashed">
                    Pendiente
                </div>
            ))}
        </div>
    );
}

function MatchCard({ match }) {
    return (
        <div className="bg-[#0B1120] border border-white/10 rounded-lg overflow-hidden shadow-lg relative group hover:border-blue-500/50 transition-colors">
            {/* Conector lines could go here */}
            <div className="flex flex-col">
                <div className={`p-2 md:p-3 flex justify-between items-center bg-white/5 border-b border-white/5 ${match.winner_id === match.player1_id ? 'bg-green-500/10' : ''}`}>
                    <span className={`text-xs md:text-sm font-medium truncate max-w-[90px] md:max-w-[140px] ${match.winner_id === match.player1_id ? 'text-green-400' : 'text-slate-300'}`}>
                        {match.player1_name || 'TBD'}
                    </span>
                    <span className="font-mono font-bold text-white text-xs md:text-sm">{match.score_p1 ?? '-'}</span>
                </div>
                <div className={`p-2 md:p-3 flex justify-between items-center ${match.winner_id === match.player2_id ? 'bg-green-500/10' : ''}`}>
                    <span className={`text-xs md:text-sm font-medium truncate max-w-[90px] md:max-w-[140px] ${match.winner_id === match.player2_id ? 'text-green-400' : 'text-slate-300'}`}>
                        {match.player2_name || 'TBD'}
                    </span>
                    <span className="font-mono font-bold text-white text-xs md:text-sm">{match.score_p2 ?? '-'}</span>
                </div>
            </div>
            {match.status === 'completed' && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-green-500 block"></div>
            )}
        </div>
    );
}
