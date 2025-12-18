'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, RefreshCw, UserMinus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { swapPlayers, replaceWithWaitlist } from '@/app/lib/tournament-actions';
import { useRouter } from 'next/navigation';

export default function ManageClient({ tournament, groups, waitlist }) {
    const router = useRouter();
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleSelect = (player) => {
        if (selectedPlayer && selectedPlayer.id === player.id) {
            setSelectedPlayer(null); // Deselect
        } else if (selectedPlayer) {
            // Swap action check?
            if (confirm(`¿Intercambiar a ${selectedPlayer.player_name} con ${player.player_name}?`)) {
                doSwap(selectedPlayer.id, player.id);
            } else {
                setSelectedPlayer(player); // Just switch selection
            }
        } else {
            setSelectedPlayer(player);
        }
    };

    const doSwap = async (p1, p2) => {
        setLoading(true);
        const res = await swapPlayers(p1, p2, tournament.id);
        setLoading(false);
        setMessage(res.message);
        setSelectedPlayer(null);
        if (res.success) router.refresh();
    };

    const handleReplace = async (player) => {
        if (!confirm(`¿Estás seguro de reemplazar a ${player.player_name} con el siguiente de la lista de espera?`)) return;

        setLoading(true);
        const res = await replaceWithWaitlist(player.id, tournament.id);
        setLoading(false);
        setMessage(res.message);
        setSelectedPlayer(null);
        if (res.success) router.refresh();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/admin/tournaments/${tournament.id}`} className="p-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Gestión de Grupos y Jugadores</h1>
            </div>

            {message && (
                <div className={`p-4 rounded-md ${message.includes('Error') ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                    {message}
                </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
                {/* ACTIVE GROUPS */}
                <div className="md:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold">Grupos Activos</h2>
                    {groups.length === 0 && <p className="text-muted-foreground">No hay grupos generados aún.</p>}

                    <div className="grid gap-4 sm:grid-cols-2">
                        {groups.map(group => (
                            <Card key={group.name} className="overflow-hidden">
                                <CardHeader className="bg-muted/50 py-3">
                                    <CardTitle className="text-base text-center">Grupo {group.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ul className="divide-y divide-border">
                                        {group.players.map(p => (
                                            <li key={p.id}
                                                className={`flex items-center justify-between p-3 transition-colors ${selectedPlayer?.id === p.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                                            >
                                                <div onClick={() => handleSelect(p)} className="cursor-pointer flex-1">
                                                    <span className="font-medium block">{p.player_name}</span>
                                                    <span className="text-xs text-muted-foreground">{p.team_name}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => handleReplace(p)}
                                                        title="Reemplazar con Lista de Espera"
                                                        className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                                    >
                                                        <UserMinus size={16} />
                                                    </Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* WAITLIST */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        Lista de Espera
                        <span className="text-sm font-normal bg-muted px-2 py-0.5 rounded-full">{waitlist.length}</span>
                    </h2>
                    <Card>
                        <CardContent className="p-0">
                            {waitlist.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    Lista vacía
                                </div>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {waitlist.map((p, idx) => (
                                        <li key={p.id} className="p-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <span className="font-medium block">{p.player_name}</span>
                                                    <span className="text-xs text-muted-foreground">{p.team_name}</span>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    <div className="bg-muted/30 p-4 rounded-md text-sm text-muted-foreground">
                        <h3 className="font-medium mb-2 text-foreground">Instrucciones</h3>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Para <strong>Intercambiar</strong>: Haz click en un jugador para seleccionarlo, luego haz click en otro.</li>
                            <li>Para <strong>Reemplazar</strong>: Usa el botón <UserMinus className="inline w-3 h-3" /> junto al jugador que sale. Entrará el primero de la lista de espera.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
