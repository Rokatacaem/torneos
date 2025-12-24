'use client';

import { updateTournament, getTournament } from '@/app/lib/tournament-actions';
import { useRouter } from 'next/navigation';
import { useState, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import TournamentGraphicsGuide from '@/app/components/admin/TournamentGraphicsGuide';

export default function EditTournamentPage({ params }) {
    // Unwrap params using React.use() as enforced in Next.js 15+ async params
    const { id } = use(params);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [initialData, setInitialData] = useState(null);

    // States for auto-config logic
    const [groupSize, setGroupSize] = useState('4');
    const [blockDuration, setBlockDuration] = useState('');

    import { debugGetTournament } from '@/app/lib/debug-actions';

    useEffect(() => {
        setLoading(true);
        debugGetTournament(id)
            .then(result => {
                if (!result.success) {
                    // Show the raw error from server
                    setError(`Error Interno: ${result.error} (ID: ${result.idReceived})`);
                    setLoading(false);
                    return;
                }

                const data = result.data;
                if (!data) {
                    setError('Torneo no encontrado');
                    setLoading(false);
                    return;
                }

                setInitialData(data);

                // Format dates for input
                const fmtDate = (d) => d ? new Date(d).toISOString().slice(0, 16) : '';

                // Safely prepare initial form data
                setInitialData({
                    ...data,
                    start_date: fmtDate(data.start_date),
                    end_date: fmtDate(data.end_date)
                });

                if (data.group_size) setGroupSize(data.group_size.toString());
                if (data.block_duration) setBlockDuration(data.block_duration?.toString() || '');

                setLoading(false);
            })
            .catch(err => {
                // Catch any client-side errors during processing
                console.error("Client processing error:", err);
                setError(`Client Error: ${err.message}`);
                setLoading(false);
            });
    }, [id]);

    async function handleSubmit(formData) {
        setSaving(true);
        setError(null);

        try {
            await updateTournament(id, formData);
            router.push(`/admin/tournaments/${id}`);
            router.refresh();
        } catch (e) {
            setError(e.message || 'Error al actualizar el torneo');
            setSaving(false);
        }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;
    if (error && !initialData) return <div className="p-8 text-red-500">{error}</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/admin/tournaments/${id}`} className="p-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Editar Torneo</h1>
            </div>

            <Card>
                <form action={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Detalles del Evento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 text-red-500 p-3 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">Nombre del Torneo</label>
                            <input
                                id="name"
                                name="name"
                                required
                                defaultValue={initialData.name}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fecha Inicio</label>
                                <input
                                    name="start_date"
                                    type="datetime-local"
                                    required
                                    defaultValue={initialData.start_date}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fecha Fin</label>
                                <input
                                    name="end_date"
                                    type="datetime-local"
                                    required
                                    defaultValue={initialData.end_date}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Cupo Máximo</label>
                                <input
                                    name="max_players"
                                    type="number"
                                    min="2"
                                    defaultValue={initialData.max_players}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Formato</label>
                                <select
                                    name="format"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    defaultValue={initialData.format}
                                >
                                    <option value="groups_ko">Grupos + Eliminatoria (Recomendado)</option>
                                    <option value="ko">Eliminación Directa (KO)</option>
                                    <option value="league">Liga (Todos contra todos)</option>
                                </select>
                            </div>
                        </div>

                        {/* Group Settings */}
                        <div className="p-4 bg-muted/30 rounded-lg space-y-4 border border-input">
                            <h3 className="font-semibold text-sm">Configuración de Grupos</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tamaño Grupo</label>
                                    <input
                                        name="group_size"
                                        type="number"
                                        min="3"
                                        max="10"
                                        value={groupSize}
                                        onChange={(e) => setGroupSize(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Duración Bloque (min)</label>
                                    <input
                                        name="block_duration"
                                        type="number"
                                        value={blockDuration}
                                        onChange={(e) => setBlockDuration(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">Tiempo estimado por grupo</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Mesas Disponibles</label>
                                <input
                                    name="tables_available"
                                    type="number"
                                    required
                                    min="1"
                                    defaultValue={initialData.tables_available || 4}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        {/* Limits */}
                        <div className="p-4 bg-muted/30 rounded-lg space-y-4 border border-input">
                            <h3 className="font-semibold text-sm">Límites de Partida (Grupos)</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Puntos</label>
                                    <input name="group_points_limit" type="number" defaultValue={initialData.group_points_limit} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Entradas</label>
                                    <input name="group_innings_limit" type="number" defaultValue={initialData.group_innings_limit} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Reloj (seg)</label>
                                    <input name="shot_clock_seconds" type="number" defaultValue={initialData.shot_clock_seconds} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                            </div>
                        </div>

                        {/* Images & Graphics */}
                        <div className="space-y-4 border-t border-border pt-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">Gráficas del Torneo</h3>

                            <TournamentGraphicsGuide />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="logo_image" className="text-sm font-medium">Logo del Torneo</label>
                                    <input
                                        id="logo_image"
                                        name="logo_image"
                                        type="file"
                                        accept="image/*"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    />
                                    {initialData.logo_image_url && (
                                        <p className="text-xs text-green-500">Logo actual cargado.</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">Opcional. Se mostrará en el header.</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="banner_image" className="text-sm font-medium">Banner/Fondo</label>
                                    <input
                                        id="banner_image"
                                        name="banner_image"
                                        type="file"
                                        accept="image/*"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    />
                                    {initialData.banner_image_url && (
                                        <p className="text-xs text-green-500">Banner actual cargado.</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">Opcional. Fondo para TV Dashboard.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2">
                                <input
                                    name="use_handicap"
                                    type="checkbox"
                                    value="true"
                                    defaultChecked={initialData.use_handicap}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm font-medium">Usar Handicap</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                        >
                            {saving && <Loader2 className="animate-spin" size={16} />}
                            Guardar Cambios
                        </button>
                    </CardContent>
                </form>
            </Card>
        </div>
    );
}
