import { query } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export default async function DebugPage() {
    let playersCount = 0;
    let samplePlayers = [];
    let error = null;

    try {
        const countRes = await query('SELECT count(*) FROM players');
        playersCount = countRes.rows[0].count;

        const sampleRes = await query('SELECT id, name, club_id, average FROM players ORDER BY id DESC LIMIT 10');
        samplePlayers = sampleRes.rows;
    } catch (e) {
        error = e.message;
    }

    return (
        <div className="p-8 text-white">
            <h1 className="text-2xl font-bold mb-4">Debug Database</h1>

            {error && <div className="bg-red-500/20 p-4 border border-red-500 rounded mb-4 text-red-200">{error}</div>}

            <div className="mb-6">
                <h2 className="text-xl font-semibold">Players Table</h2>
                <p>Total Count: <span className="text-blue-400 font-mono text-xl">{playersCount}</span></p>
            </div>

            <div className="border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-800 text-slate-400">
                        <tr>
                            <th className="p-2">ID</th>
                            <th className="p-2">Name</th>
                            <th className="p-2">Club ID</th>
                            <th className="p-2">Average</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {samplePlayers.map(p => (
                            <tr key={p.id}>
                                <td className="p-2 font-mono text-xs">{p.id}</td>
                                <td className="p-2">{p.name}</td>
                                <td className="p-2">{p.club_id}</td>
                                <td className="p-2">{p.average}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
