import Link from 'next/link';
import { getTournaments } from '@/app/lib/tournament-actions';
import { formatDate } from '@/app/lib/utils';
import { Plus, Eye } from 'lucide-react';
import DeleteTournamentButton from '@/app/components/admin/DeleteTournamentButton';

export const dynamic = 'force-dynamic';

export default async function AdminTournamentsPage() {
    const tournaments = await getTournaments();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Gestión de Torneos</h1>
                <Link href="/admin/tournaments/create" className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors">
                    <Plus size={20} />
                    Nuevo Torneo
                </Link>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block border rounded-lg bg-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-left font-medium">
                        <tr>
                            <th className="p-4">Nombre</th>
                            <th className="p-4">Fecha Inicio</th>
                            <th className="p-4">Formato</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {tournaments.map((t) => (
                            <tr key={t.id} className="hover:bg-muted/50 transition-colors">
                                <td className="p-4 font-medium">{t.name}</td>
                                <td className="p-4 text-muted-foreground">{formatDate(t.start_date)}</td>
                                <td className="p-4 capitalize">{t.format}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide ${t.status === 'active' ? 'bg-primary/20 text-primary' :
                                        t.status === 'completed' ? 'bg-muted text-muted-foreground' : 'bg-yellow-500/20 text-yellow-600'
                                        }`}>
                                        {t.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Link
                                            href={`/admin/tournaments/${t.id}`}
                                            className="p-2 hover:bg-muted rounded-md text-blue-500 transition-colors"
                                            title="Ver Detalle"
                                        >
                                            <Eye size={18} />
                                        </Link>
                                        <DeleteTournamentButton id={t.id} name={t.name} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {tournaments.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                    No se encontraron torneos.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
                {tournaments.map((t) => (
                    <div key={t.id} className="bg-card border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-lg">{t.name}</h3>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${t.status === 'active' ? 'bg-primary/20 text-primary' :
                                t.status === 'completed' ? 'bg-muted text-muted-foreground' : 'bg-yellow-500/20 text-yellow-600'
                                }`}>
                                {t.status}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div>
                                <span className="block text-xs uppercase opacity-70">Fecha</span>
                                {formatDate(t.start_date)}
                            </div>
                            <div>
                                <span className="block text-xs uppercase opacity-70">Formato</span>
                                {t.format}
                            </div>
                        </div>
                        <div className="pt-2 flex justify-end gap-2 border-t border-white/5">
                            <Link
                                href={`/admin/tournaments/${t.id}`}
                                className="flex-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 flex items-center justify-center gap-2 py-2 rounded-md font-medium text-sm transition-colors"
                            >
                                <Eye size={16} /> Ver Detalle
                            </Link>
                            <div className="flex items-center">
                                <DeleteTournamentButton id={t.id} name={t.name} />
                            </div>
                        </div>
                    </div>
                ))}
                {tournaments.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground bg-card border rounded-lg">
                        No se encontraron torneos.
                    </div>
                )}
            </div>
        </div>
    );
}
