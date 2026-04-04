'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Trophy, Users, Settings, LogOut } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { logoutAction } from '@/app/lib/auth-actions';
import { AdminNav } from './AdminNav';

export function AdminSidebar({ role }) {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);
    
    // Detectar si el primer segmento es un slug (multi-tenant path strategy)
    const reserved = ['admin', 'login', 'api', 'referee'];
    const slug = (!reserved.includes(segments[0]) && segments.length > 1) ? segments[0] : '';
    const adminPath = slug ? `/${slug}/admin` : '/admin';

    const isActive = (path) => pathname === path || pathname === `${slug}${path}`;
    const isSuperAdmin = role === 'SUPERADMIN' || role === 'superadmin';

    return (
        <aside className="w-64 bg-[#0f2040] border-r border-white/10 hidden md:flex flex-col">
            <div className="p-4 flex justify-center w-full">
                <img src="/Logo3DAzul.png" alt="Torneos Pro" className="w-full h-auto object-contain" />
            </div>

            <nav className="flex-1 p-4 space-y-1">
                <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">Menu</p>
                <Link
                    href={adminPath}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        pathname === adminPath
                            ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                >
                    <LayoutDashboard size={18} />
                    Dashboard
                </Link>
                <Link
                    href={`${adminPath}/tournaments`}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        pathname.startsWith(`${adminPath}/tournaments`)
                            ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                >
                    <Trophy size={18} />
                    Torneos
                </Link>
                <Link
                    href={`${adminPath}/ranking`}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        pathname.startsWith(`${adminPath}/ranking`)
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
                    href={`${adminPath}/players`}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        pathname.startsWith(`${adminPath}/players`)
                            ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                >
                    <Users size={18} />
                    Jugadores
                </Link>
                <Link
                    href={`${adminPath}/clubs`}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        pathname.startsWith(`${adminPath}/clubs`)
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
                        href={`${adminPath}/users`}
                        className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                            pathname.startsWith(`${adminPath}/users`)
                                ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <Users size={18} />
                        Accesos y Usuarios
                    </Link>
                )}
                <Link
                    href={`${adminPath}/profile`}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        pathname.startsWith(`${adminPath}/profile`)
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
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 transition-all duration-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>
                    Panel Jueces (Móvil)
                </Link>
            </nav>

            <div className="p-4 border-t border-white/5 relative">
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-blue-900/20 to-transparent pointer-events-none" />
                <button
                    onClick={() => logoutAction()}
                    className="flex items-center gap-3 w-full px-4 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm font-medium relative z-10"
                >
                    <LogOut size={18} />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
}
