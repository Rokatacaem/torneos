
'use client';

import { useState } from 'react';
import { recalculateGlobalRankingAction } from '@/app/lib/tournament-actions';
import { RefreshCw } from 'lucide-react';

export default function RecalculateButton() {
    const [loading, setLoading] = useState(false);

    const handleRecalculate = async () => {
        if (!confirm('¿Estás seguro de recalcular todo el ranking global?\nEsto analizará todos los torneos finalizados (que no sean de prueba), determinará categorías A/B/C y actualizará los puntos de todos los jugadores.')) return;

        setLoading(true);
        const res = await recalculateGlobalRankingAction();
        setLoading(false);
        alert(res.message);
    };

    return (
        <button
            onClick={handleRecalculate}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50"
        >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Calculando...' : 'Recalcular Ranking'}
        </button>
    );
}
