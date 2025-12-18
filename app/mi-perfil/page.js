import { getSession } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { getClubs } from '@/app/lib/tournament-actions'; // Import getClubs
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ProfileEditor from './ProfileEditor'; // Import Client Component

export default async function ProfilePage() {
    const session = await getSession();

    if (!session || session.role !== 'player') {
        redirect('/login');
    }

    // Fetch full profile data
    const res = await query(`
        SELECT u.id as user_id, u.name as username, u.email, u.role,
               p.id as player_id, p.name as player_name, p.ranking, p.category, p.average, p.photo_url, p.club_id,
               c.name as club_name,
               p.ranking_annual, p.total_carambolas, p.total_innings, p.tournaments_played
        FROM users u
        LEFT JOIN players p ON u.player_id = p.id
        LEFT JOIN clubs c ON p.club_id = c.id
        WHERE u.id = $1
    `, [session.userId]);

    const profile = res.rows[0];

    if (!profile) {
        return <div>Error cargando perfil</div>;
    }

    // Fetch clubs for dropdown
    const clubs = await getClubs();

    return (
        <div className="min-h-screen bg-background">
            <nav className="border-b border-border bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
                <div className="font-bold">FECHILLAR | Mi Perfil</div>
                <div className="flex gap-4 text-sm">
                    <Link href="/" className="hover:text-blue-400">Volver al Sitio</Link>
                    <form action={async () => {
                        'use server';
                        const { logout } = await import('@/app/lib/auth');
                        await logout();
                        redirect('/login');
                    }}>
                        <button type="submit" className="text-red-400 hover:text-red-300">Cerrar Sesión</button>
                    </form>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto p-6 space-y-8">

                {/* Header Card */}
                <div className="bg-slate-800 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6 border border-slate-700">
                    <div className="w-32 h-32 flex-shrink-0 bg-slate-700 rounded-full flex items-center justify-center overflow-hidden border-4 border-slate-600 shadow-xl">
                        {profile.photo_url ? (
                            <img src={profile.photo_url} alt={profile.player_name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-4xl font-bold text-slate-500">{profile.player_name?.charAt(0) || 'U'}</span>
                        )}
                    </div>
                    <div className="text-center md:text-left flex-grow">
                        <h1 className="text-3xl font-bold text-white mb-1">{profile.player_name || profile.username}</h1>
                        <p className="text-slate-400 text-lg mb-3">{profile.club_name || 'Sin Club Registrado'}</p>

                        <div className="flex gap-2 justify-center md:justify-start flex-wrap">
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-full border border-blue-500/20">
                                {profile.role === 'player' ? 'JUGADOR FEDERADO' : 'USUARIO'}
                            </span>
                            {profile.category && (
                                <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/20">
                                    CATEGORÍA {profile.category}
                                </span>
                            )}
                        </div>

                        {/* Editor Component */}
                        <ProfileEditor profile={profile} clubs={clubs} />
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Ranking Nacional</div>
                        <div className="text-4xl font-black text-white">#{profile.ranking || '-'}</div>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Puntos Anuales</div>
                        <div className="text-4xl font-black text-yellow-500">{profile.ranking_annual || 0}</div>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Promedio</div>
                        <div className="text-4xl font-black text-blue-400">{profile.average ? parseFloat(profile.average).toFixed(3) : '-'}</div>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Torneos</div>
                        <div className="text-4xl font-black text-green-400">{profile.tournaments_played || 0}</div>
                    </div>
                </div>

                {/* Next Steps Hint */}
                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl">
                    <h3 className="font-bold text-white mb-2">Próximamente</h3>
                    <p className="text-slate-400 text-sm">
                        Desde aquí podrás inscribirte a los torneos de la temporada 2025, ver tu historial de partidas y pagar tu licencia anual.
                    </p>
                </div>

            </main>
        </div>
    );
}
