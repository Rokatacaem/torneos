'use client';

import { createTournament, getClubs } from '@/app/lib/tournament-actions';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/app/components/ui/card';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/app/lib/utils';
import TournamentGraphicsGuide from '@/app/components/admin/TournamentGraphicsGuide';


export default function CreateTournamentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handleSubmit(formData) {
        setLoading(true);
        setError(null);

        // Client-side validation if needed (e.g. file size)

        try {
            await createTournament(formData);
            router.push('/admin/tournaments');
            router.refresh();
        } catch (e) {
            setError(e.message || 'Error al crear el torneo');
        } finally {
            setLoading(false);
        }
    }

    // Auto-config logic for Chilean context
    const [groupSize, setGroupSize] = useState('4');
    const [blockDuration, setBlockDuration] = useState('240');
    // We don't control the date input value directly easily without controlled state for everything, 
    // but we can try to set a default if it's empty or just suggest it in the placeholder/helper.
    // Better: Controlled state for start_date to set 10:00.
    const [startDate, setStartDate] = useState('');

    const [clubs, setClubs] = useState([]);
    const [tablesAvailable, setTablesAvailable] = useState('4');
    const [selectedClubId, setSelectedClubId] = useState('');
    const [selectedDiscipline, setSelectedDiscipline] = useState('');
    const [useHandicap, setUseHandicap] = useState(false);

    useEffect(() => {
        getClubs().then(setClubs).catch(console.error);
    }, []);

    // Helper to calculate tables based on club and discipline
    const calculateTables = (clubId, discipline) => {
        if (!clubId) return;
        const club = clubs.find(c => c.id.toString() === clubId);
        if (!club) return;

        let total = 0;
        if (!discipline) {
            // Default: Sum all
            total = (club.tables_billar || 0) + (club.tables_pool || 0) + (club.tables_bola9 || 0) + (club.tables_snooker || 0);
        } else if (discipline.includes('Carambola')) {
            total = club.tables_billar || 0;
        } else if (discipline.includes('Bola 9')) {
            total = club.tables_bola9 || 0;
        } else if (discipline.includes('Snooker')) {
            total = club.tables_snooker || 0;
        } else if (discipline.includes('Pool')) {
            // General Pool (8, 10, Chileno) usually maps to standard pool tables
            total = club.tables_pool || 0;
        } else {
            // Fallback
            total = (club.tables_billar || 0) + (club.tables_pool || 0) + (club.tables_bola9 || 0) + (club.tables_snooker || 0);
        }

        if (total > 0) setTablesAvailable(total.toString());
        else setTablesAvailable('0'); // Or keep previous? Better to show 0 if none available for discipline
    };

    const handleClubChange = (e) => {
        const clubId = e.target.value;
        setSelectedClubId(clubId);
        calculateTables(clubId, selectedDiscipline);
    };

    const handleDisciplineChange = (e) => {
        const discipline = e.target.value;
        setSelectedDiscipline(discipline);
        calculateTables(selectedClubId, discipline);
    };

    const handleGroupSizeChange = (e) => {
        const size = e.target.value;
        setGroupSize(size);
        if (size === '3') {
            setBlockDuration('180'); // 3 hours
            if (startDate) {
                // Keep date, set time to 10:00
                const datePart = startDate.split('T')[0];
                setStartDate(`${datePart}T10:00`);
            }
        } else if (size === '4') {
            setBlockDuration('240'); // 4 hours
            if (startDate) {
                const datePart = startDate.split('T')[0];
                setStartDate(`${datePart}T10:00`);
            }
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/tournaments" className="p-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Torneo</h1>
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
                            <label htmlFor="discipline" className="text-sm font-medium">Disciplina</label>
                            <select
                                id="discipline"
                                name="discipline"
                                required
                                onChange={handleDisciplineChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <option value="">-- Seleccionar Disciplina --</option>
                                <option value="Carambola 3 Bandas">Carambola 3 Bandas</option>
                                <option value="Pool Bola 8">Pool Bola 8</option>
                                <option value="Pool Bola 9">Pool Bola 9</option>
                                <option value="Pool Bola 10">Pool Bola 10</option>
                                <option value="Pool Chileno">Pool Chileno</option>
                                <option value="Snooker">Snooker</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">Nombre del Torneo</label>
                            <input
                                id="name"
                                name="name"
                                required
                                placeholder="Ej: Torneo Verano 2025"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="host_club_id" className="text-sm font-medium">Club Sede</label>
                            <select
                                id="host_club_id"
                                name="host_club_id"
                                value={selectedClubId}
                                onChange={handleClubChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <option value="">-- Seleccionar Sede --</option>
                                {clubs.map(club => (
                                    <option key={club.id} value={club.id}>
                                        {club.name} ({club.city})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">Define las mesas disponibles según disciplina.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="start_date" className="text-sm font-medium">Fecha Inicio</label>
                                <input
                                    id="start_date"
                                    name="start_date"
                                    type="datetime-local"
                                    required
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="end_date" className="text-sm font-medium">Fecha Fin</label>
                                <input
                                    id="end_date"
                                    name="end_date"
                                    type="datetime-local"
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="max_players" className="text-sm font-medium">Máximo de Jugadores</label>
                                <input
                                    id="max_players"
                                    name="max_players"
                                    type="number"
                                    min="2"
                                    defaultValue="32"
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="format" className="text-sm font-medium">Formato</label>
                                <select
                                    id="format"
                                    name="format"
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    <option value="elimination">Eliminación Directa</option>
                                    <option value="groups_elimination">Grupos + Eliminatoria</option>
                                    <option value="league">Liga (Todos contra Todos)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="group_size" className="text-sm font-medium">Jugadores por Grupo</label>
                                <select
                                    id="group_size"
                                    name="group_size"
                                    value={groupSize}
                                    onChange={handleGroupSizeChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    <option value="3">3 Jugadores</option>
                                    <option value="4">4 Jugadores</option>
                                </select>
                                <p className="text-xs text-muted-foreground">Solo aplica para formato de Grupos.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Duración Bloque (min)</label>
                                <input
                                    id="block_duration"
                                    name="block_duration"
                                    type="number"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    placeholder="Minutos por grupo"
                                    value={blockDuration}
                                    onChange={(e) => setBlockDuration(e.target.value)}
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
                                value={tablesAvailable}
                                onChange={(e) => setTablesAvailable(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                placeholder="Cantidad de mesas"
                            />
                            <p className="text-xs text-muted-foreground">Para asignar horarios (Turnos)</p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="shot_clock" className="text-sm font-medium">Reloj de Tiro (Segundos)</label>
                            <input
                                id="shot_clock"
                                name="shot_clock"
                                type="number"
                                min="10"
                                max="120"
                                defaultValue="40"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            />
                            <p className="text-xs text-muted-foreground">Tiempo límite para ejecutar el tiro.</p>
                        </div>



                        {/* Límites de Fase */}
                        {/* Imágenes */}
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
                                    <p className="text-xs text-muted-foreground">Opcional. Fondo para TV Dashboard.</p>
                                </div>
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
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    defaultValue="16"
                                >
                                    <option value="4">4 Jugadores (Semis)</option>
                                    <option value="8">8 Jugadores (Cuartos)</option>
                                    <option value="16">16 Jugadores (Octavos)</option>
                                    <option value="32">32 Jugadores (1/16)</option>
                                    <option value="64">64 Jugadores (1/32)</option>
                                </select>
                                <p className="text-xs text-muted-foreground">Objetivo para la fase eliminatoria principal.</p>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="qualifiers_per_group" className="text-sm font-medium">Clasificados por Grupo</label>
                                <input
                                    id="qualifiers_per_group"
                                    name="qualifiers_per_group"
                                    type="number"
                                    min="1"
                                    max="4"
                                    defaultValue="2"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                />
                                <p className="text-xs text-muted-foreground">Cuántos pasan de cada grupo.</p>
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

                        {/* Límites de Fase */}
                        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                            <h3 className="col-span-2 font-semibold flex items-center gap-2">Reglas por Fase (Carambolas / Entradas)</h3>

                            {/* Grupos */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Fase Grupos</label>
                                <div className="flex gap-2">
                                    {!useHandicap && (
                                        <input
                                            name="group_points_limit"
                                            type="number"
                                            placeholder="Pts"
                                            defaultValue="30"
                                            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                                        />
                                    )}
                                    <input
                                        name="group_innings_limit"
                                        type="number"
                                        placeholder="Ent"
                                        defaultValue="20"
                                        className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Eliminatoria General */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Eliminatoria (Base)</label>
                                <div className="flex gap-2">
                                    {!useHandicap && (
                                        <input
                                            name="playoff_points_limit"
                                            type="number"
                                            placeholder="Pts"
                                            defaultValue="40"
                                            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                                        />
                                    )}
                                    <input
                                        name="playoff_innings_limit"
                                        type="number"
                                        placeholder="Ent"
                                        defaultValue="30"
                                        className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Semifinal */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-orange-500">Semifinal</label>
                                <div className="flex gap-2">
                                    {!useHandicap && (
                                        <input
                                            name="semifinal_points_limit"
                                            type="number"
                                            placeholder="Pts"
                                            className="w-full h-9 rounded-md border bg-background px-2 text-sm border-orange-500/30"
                                        />
                                    )}
                                    <input
                                        name="semifinal_innings_limit"
                                        type="number"
                                        placeholder="Ent"
                                        className="w-full h-9 rounded-md border bg-background px-2 text-sm border-orange-500/30"
                                    />
                                </div>
                            </div>

                            {/* Final */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-yellow-500">Gran Final</label>
                                <div className="flex gap-2">
                                    {!useHandicap && (
                                        <input
                                            name="final_points_limit"
                                            type="number"
                                            placeholder="Pts"
                                            className="w-full h-9 rounded-md border bg-background px-2 text-sm border-yellow-500/30"
                                        />
                                    )}
                                    <input
                                        name="final_innings_limit"
                                        type="number"
                                        placeholder="Ent"
                                        className="w-full h-9 rounded-md border bg-background px-2 text-sm border-yellow-500/30"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors",
                                loading && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            {loading ? 'Guardando...' : 'Guardar Torneo'}
                        </button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
