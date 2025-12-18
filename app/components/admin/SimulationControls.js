'use client';

import { useState } from 'react';
import { simulateTournamentData } from '@/app/lib/simulation-actions';
import { useRouter } from 'next/navigation';
import { DatabaseZap } from 'lucide-react';

export default function SimulationControls() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSimulate() {
        if (!confirm('Esto borrará datos previos y creará un torneo "Grand Slam 2025" con 64 jugadores. ¿Continuar?')) return;

        setLoading(true);
        try {
            await simulateTournamentData();
            alert('Simulación completada con éxito');
            router.refresh();
        } catch (error) {
            alert('Error en simulación: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleSimulate}
            disabled={loading}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm font-bold shadow-sm shadow-purple-500/20"
        >
            <DatabaseZap size={16} />
            {loading ? 'Simulando...' : 'Simular Datos Demo'}
        </button>
    );
}
