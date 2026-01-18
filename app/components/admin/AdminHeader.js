'use client';
import { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { AdminNav } from './AdminNav';
import { getSession } from '@/app/lib/session';

export function AdminHeader({ userName, role }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <header className="h-16 border-b bg-card flex items-center justify-between px-6">
            {/* Mobile Toggle */}
            <div className="md:hidden flex items-center gap-2">
                <button onClick={() => setIsOpen(true)} className="p-2 -ml-2 text-foreground hover:bg-accent rounded-md">
                    <Menu size={24} />
                </button>
                <span className="font-bold">Admin</span>
            </div>

            {/* User Info (Right Side) */}
            <div className="ml-auto flex items-center gap-4">
                <div className="text-sm text-muted-foreground hidden sm:block">
                    {userName}
                </div>
                <div className="h-8 w-8 bg-accent rounded-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {userName ? userName[0] : 'A'}
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

                    {/* Sidebar */}
                    <aside className="relative w-64 bg-[#0f2040] h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
                        {/* Header/Close */}
                        <div className="p-4 flex justify-between items-center border-b border-white/10 bg-[#0a162c]">
                            <img src="/Logo3DAzul.png" alt="Torneos Pro" className="h-8 w-auto object-contain" />
                            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white bg-white/5 p-1 rounded-md">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Nav */}
                        <AdminNav role={role} onLinkClick={() => setIsOpen(false)} />

                        {/* Logout */}
                        <div className="p-4 border-t border-white/5 bg-[#0a162c]">
                            <button
                                onClick={() => logoutAction()}
                                className="flex items-center gap-3 w-full px-4 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm font-medium"
                            >
                                <LogOut size={18} />
                                Cerrar Sesión
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </header>
    );
}
