'use client';

import { useState } from 'react';
import { setupManualGroups } from '@/app/lib/manual-setup';

export default function ManualSetupPage() {
    const [status, setStatus] = useState('idle');
    const [result, setResult] = useState(null);

    const handleSetup = async () => {
        setStatus('running');
        const res = await setupManualGroups();
        setResult(res);
        setStatus('done');
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Configuración Manual de Grupos (11 grupos - 33 jugadores)</h1>
            <p className="mb-6 text-gray-600">
                Esta página ejecutará la inserción masiva de los jugadores y grupos según la captura proporcionada.
                Se limpiará el fixture actual del torneo <strong>Grand Slam Ranking 2025</strong>.
            </p>

            {status === 'idle' && (
                <button 
                    onClick={handleSetup}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow transion-all"
                >
                    Ejecutar Configuración Ahora
                </button>
            )}

            {status === 'running' && (
                <div className="flex items-center space-x-2 text-blue-600">
                    <span className="animate-spin text-xl">⏳</span>
                    <span>Procesando base de datos...</span>
                </div>
            )}

            {status === 'done' && (
                <div className={`p-4 rounded border ${result?.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {result?.success ? (
                        <>
                            <h2 className="font-bold flex items-center mb-1">✅ ¡Éxito!</h2>
                            <p>El torneo ha sido configurado con 11 grupos y 33 jugadores.</p>
                            <a href={`/admin/tournaments/${result.tournamentId}`} className="mt-4 inline-block font-semibold underline">Ver Torneo en el Panel de Administración</a>
                        </>
                    ) : (
                        <>
                            <h2 className="font-bold mb-1">❌ Error</h2>
                            <p>{result?.error || 'Ocurrió un error desconocido durante la ejecución.'}</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
