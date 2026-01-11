'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Trophy, Users, Settings, LogOut } from 'lucide-react';
import { cn } from '@/app/lib/utils';

export function AdminNav({ role, onLinkClick }) {
    const pathname = usePathname();
    const isActive = (path) => pathname === path;
    const isSuperAdmin = role === 'SUPERADMIN' || role === 'superadmin';

    const handleClick = () => {
        if (onLinkClick) onLinkClick();
    };

    return (
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">Menu</p>
            <Link
                href="/admin"
                onClick={handleClick}
                className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive('/admin')
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
            >
                <LayoutDashboard size={18} />
                Dashboard
            </Link>
            <Link
                href="/admin/tournaments"
                onClick={handleClick}
                className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    pathname.startsWith('/admin/tournaments')
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
            >
                <Trophy size={18} />
                Torneos
            </Link>
            <Link
                href="/admin/ranking"
                onClick={handleClick}
                className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    pathname.startsWith('/admin/ranking')
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
            >
                <div className="relative">
                    <Trophy size={18} className="text-yellow-500" />
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                    </span>
                </div>
                Ranking Nacional
            </Link>
            <Link
                href="/admin/players"
                onClick={handleClick}
                className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    pathname.startsWith('/admin/players')
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
            >
                <Users size={18} />
                Jugadores
            </Link>
            <Link
                href="/admin/clubs"
                onClick={handleClick}
                className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    pathname.startsWith('/admin/clubs')
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
            >
                <Trophy size={18} />
                Clubes
            </Link>

            {isSuperAdmin && (
                <Link
                    href="/admin/settings"
                    onClick={handleClick}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive('/admin/settings')
                            ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                >
                    <Settings size={18} />
                    Configuración
                </Link>
            )}

            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6">Administración</p>
            {(role === 'admin' || isSuperAdmin) && (
                <Link
                    href="/admin/users"
                    onClick={handleClick}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        pathname.startsWith('/admin/users')
                            ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                >
                    <Users size={18} />
                    Accesos y Usuarios
                </Link>
            )}
            <Link
                href="/admin/profile"
                onClick={handleClick}
                className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    pathname.startsWith('/admin/profile')
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
            >
                <Settings size={18} />
                Mi Perfil
            </Link>

            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6">Aplicaciones</p>
            <Link
                href="/referee"
                target="_blank"
                onClick={handleClick}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 transition-all duration-200"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>
                Panel Jueces (Móvil)
            </Link>
        </nav>
    );
}
