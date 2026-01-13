'use client';

import { updateTournament } from '@/app/lib/tournament-actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import TournamentGraphicsGuide from '@/app/components/admin/TournamentGraphicsGuide';
import { upload } from '@vercel/blob/client';

export default function EditTournamentForm({ tournament }) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Initial state setup from props
    const fmtDate = (d) => d ? new Date(d).toISOString().slice(0, 16) : '';

    // Auto-config states
    const [groupSize, setGroupSize] = useState(tournament.group_size?.toString() || '4');
    const [blockDuration, setBlockDuration] = useState(tournament.block_duration?.toString() || '');
    const [useHandicap, setUseHandicap] = useState(tournament.use_handicap || false);

    async function handleSubmit(formData) {
        setSaving(true);
        setError(null);

        // Client-side File Size Validation
        const MAX_SIZE_MB = 4.5;
        const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;

        const logoFile = formData.get('logo_image');
        const bannerFile = formData.get('banner_image');
        const brandingFile = formData.get('branding_image');

        if (logoFile && logoFile.size > MAX_BYTES) {
            setError(`El logo es muy pesado (${(logoFile.size / 1024 / 1024).toFixed(2)} MB). Máximo permitido: ${MAX_SIZE_MB}MB.`);
            setSaving(false);
            return;
        }

        if (bannerFile && bannerFile.size > MAX_BYTES) {
            setError(`El banner es muy pesado (${(bannerFile.size / 1024 / 1024).toFixed(2)} MB). Máximo permitido: ${MAX_SIZE_MB}MB.`);
            setSaving(false);
            return;
        }

        if (brandingFile && brandingFile.size > MAX_BYTES) {
            setError(`La imagen branding es muy pesada (${(brandingFile.size / 1024 / 1024).toFixed(2)} MB). Máximo permitido: ${MAX_SIZE_MB}MB.`);
            setSaving(false);
            return;
        }

        try {
            // Client-Side Uploads
            if (logoFile && logoFile.size > 0) {
                const blob = await upload(logoFile.name, logoFile, {
                    access: 'public',
                    handleUploadUrl: '/api/upload',
                });
                formData.set('logo_image_url', blob.url);
            }

            if (bannerFile && bannerFile.size > 0) {
                const blob = await upload(bannerFile.name, bannerFile, {
                    access: 'public',
                    handleUploadUrl: '/api/upload',
                });
                formData.set('banner_image_url', blob.url);
            }

            if (brandingFile && brandingFile.size > 0) {
                const blob = await upload(brandingFile.name, brandingFile, {
                    access: 'public',
                    handleUploadUrl: '/api/upload',
                });
                formData.set('branding_image_url', blob.url);
            }

            // Clean up raw files
            // Clean up raw files
            formData.delete('logo_image');
            formData.delete('banner_image');
            formData.delete('branding_image');

            const result = await updateTournament(tournament.id, formData);

            if (result && result.success) {
                router.push(`/admin/tournaments/${tournament.id}`);
                router.refresh();
            } else {
                throw new Error(result?.message || 'Error desconocido del servidor');
            }
        } catch (e) {
            console.error(e);
            setError(e.message || 'Error al actualizar el torneo');
            setSaving(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/admin/tournaments/${tournament.id}`} className="p-2 hover:bg-muted rounded-full transition-colors">
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
                                defaultValue={tournament.name}
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
                                    defaultValue={fmtDate(tournament.start_date)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fecha Fin</label>
                                <input
                                    name="end_date"
                                    type="datetime-local"
                                    required
                                    defaultValue={fmtDate(tournament.end_date)}
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
                                    defaultValue={tournament.max_players}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Formato</label>
                                <select
                                    name="format"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    defaultValue={tournament.format}
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
                                    <label className="text-sm font-medium">Formato de Fase de Grupos</label>
                                    <select
                                        name="group_format"
                                        defaultValue={tournament.group_format || 'round_robin'}
                                        onChange={(e) => {
                                            if (e.target.value === 'gsl') setGroupSize('4');
                                        }}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        <option value="round_robin">Todos contra Todos (Round Robin)</option>
                                        <option value="gsl">Doble Eliminación (GSL)</option>
                                    </select>
                                </div>
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
                                    defaultValue={tournament.tables_available || 4}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        {/* Configuración de Playoffs */}
                        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                            <h3 className="col-span-2 font-semibold flex items-center gap-2">Configuración de Clasificación</h3>
                            <div className="space-y-2">
                                <label htmlFor="playoff_target_size" className="text-sm font-medium">Tamaño Cuadro Final</label>
                                <select
                                    id="playoff_target_size"
                                    name="playoff_target_size"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    defaultValue={tournament.playoff_target_size || 16}
                                >
                                    <option value="4">4 Jugadores (Semis)</option>
                                    <option value="8">8 Jugadores (Cuartos)</option>
                                    <option value="16">16 Jugadores (Octavos)</option>
                                    <option value="32">32 Jugadores</option>
                                    <option value="64">64 Jugadores</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="qualifiers_per_group" className="text-sm font-medium">Clasifican por Grupo</label>
                                <input
                                    id="qualifiers_per_group"
                                    name="qualifiers_per_group"
                                    type="number"
                                    min="1"
                                    max="4"
                                    defaultValue={tournament.qualifiers_per_group || 2}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 border-t border-border pt-4">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2">
                                    <input
                                        name="use_handicap"
                                        type="checkbox"
                                        checked={useHandicap}
                                        onChange={(e) => setUseHandicap(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <span className="text-sm font-medium">Usar Handicap (Billar 3 Bandas)</span>
                                </label>
                                <p className="text-xs text-muted-foreground ml-6">
                                    Si se activa, la distancia de partida será el hándicap individual de cada jugador.
                                    {useHandicap && <span className="text-blue-500 font-semibold block mt-1">Modo Hándicap Activo: Los límites de puntos se ignoran/ocultan.</span>}
                                </p>
                            </div>
                        </div>

                        {/* Limits */}
                        <div className="p-4 bg-muted/30 rounded-lg space-y-4 border border-input">
                            <h3 className="font-semibold text-sm">Controles de Partida (Fase Grupos)</h3>
                            <div className="grid grid-cols-3 gap-4">
                                {!useHandicap && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Puntos (Distancia)</label>
                                        <input name="group_points_limit" type="number" defaultValue={tournament.group_points_limit} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Entradas (Límite)</label>
                                    <input name="group_innings_limit" type="number" defaultValue={tournament.group_innings_limit} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Reloj (seg)</label>
                                    <input name="shot_clock_seconds" type="number" defaultValue={tournament.shot_clock_seconds} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                            </div>

                            {/* Límites de Fase - Eliminatoria */}
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 mt-4">
                                <h3 className="col-span-2 font-semibold text-sm">Eliminatoria (Base)</h3>
                                {!useHandicap && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Puntos</label>
                                        <input name="playoff_points_limit" type="number" defaultValue={tournament.playoff_points_limit} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium">Entradas</label>
                                    <input name="playoff_innings_limit" type="number" defaultValue={tournament.playoff_innings_limit} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                            </div>

                            {/* Semifinal */}
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 mt-4">
                                <h3 className="col-span-2 font-semibold text-sm text-orange-500">Semifinal (Opcional)</h3>
                                {!useHandicap && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Puntos</label>
                                        <input name="semifinal_points_limit" type="number" defaultValue={tournament.semifinal_points_limit} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm border-orange-500/30" placeholder="Igual a Base" />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium">Entradas</label>
                                    <input name="semifinal_innings_limit" type="number" defaultValue={tournament.semifinal_innings_limit} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm border-orange-500/30" placeholder="Igual a Base" />
                                </div>
                            </div>

                            {/* Final */}
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 mt-4">
                                <h3 className="col-span-2 font-semibold text-sm text-yellow-500">Gran Final (Opcional)</h3>
                                {!useHandicap && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Puntos</label>
                                        <input name="final_points_limit" type="number" defaultValue={tournament.final_points_limit} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm border-yellow-500/30" placeholder="Igual a Base" />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium">Entradas</label>
                                    <input name="final_innings_limit" type="number" defaultValue={tournament.final_innings_limit} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm border-yellow-500/30" placeholder="Igual a Base" />
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
                                    {tournament.logo_image_url && (
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
                                    {tournament.banner_image_url && (
                                        <p className="text-xs text-green-500">Banner actual cargado.</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">Opcional. Fondo para TV Dashboard.</p>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label htmlFor="branding_image" className="text-sm font-medium">Branding / Footer (Patrocinador)</label>
                                    <input
                                        id="branding_image"
                                        name="branding_image"
                                        type="file"
                                        accept="image/*"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    />
                                    {tournament.branding_image_url && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-green-500">Imagen actual cargada.</p>
                                            <img src={tournament.branding_image_url} alt="Current Branding" className="h-6 w-auto object-contain border border-white/10" />
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">Opcional. Aparece en la esquina inferior derecha del TV Dashboard (Replaza "Copa Hermandad").</p>
                                </div>
                            </div>
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
