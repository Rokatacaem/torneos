
'use client';

import { useState } from 'react';
import { finalizeRankingForTournament } from '@/app/lib/tournament-actions';
import { Trophy } from 'lucide-react';

export default function FinalizeTournamentButton({ tournament }) {
    const [loading, setLoading] = useState(false);

    if (tournament.status === 'completed' || tournament.status === 'draft') return null;

    const handleFinalize = async () => {
        if (!confirm('¿Finalizar torneo y asignar puntos de Ranking?\nEsto calculará posiciones finales y actualizará el Ranking Nacional.')) return;

        setLoading(true);
        const res = await finalizeRankingForTournament(tournament.id);
        setLoading(false);
        alert(res.message);
    };

    return (
        <button
            onClick={handleFinalize}
            disabled={loading}
            className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50"
        >
            <Trophy size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Procesando...' : 'Finalizar Torneo y Ranking'}
        </button>
    );
}
