'use client';

import { useActionState } from 'react';
import { registerPlayer } from '@/app/lib/auth-actions';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
    const [state, formAction, isPending] = useActionState(registerPlayer, null);

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-slate-900 rounded-lg shadow-lg border border-slate-800">
                <div className="text-center">
                    <h1 className="text-2xl font-bold tracking-tight text-white">Únete a FECHILLAR</h1>
                    <p className="mt-2 text-sm text-slate-400">Crea tu cuenta de jugador</p>
                </div>

                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-slate-200">
                            Nombre y Apellido (Ficha Deportiva)
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 placeholder-slate-600"
                            placeholder="Ej: Juan Pérez"
                        />
                        <p className="text-xs text-slate-500">
                            Si ya juegas torneos, usa tu nombre exacto para vincular tu ranking.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="username" className="text-sm font-medium text-slate-200">
                            Usuario
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            required
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100"
                            placeholder="juanperez"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-slate-200">
                            Correo Electrónico
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100"
                            placeholder="juan@email.com"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-slate-200">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-200">
                                Confirmar
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100"
                            />
                        </div>
                    </div>

                    {state?.error && (
                        <div className="p-3 text-sm text-red-500 bg-red-950/30 border border-red-900/50 rounded-md text-center">
                            {state.error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPending ? 'Creando cuenta...' : 'Registrarse'}
                    </button>
                </form>

                <div className="text-center text-sm">
                    <Link href="/login" className="text-blue-400 hover:text-blue-300">
                        ¿Ya tienes cuenta? Inicia Sesión
                    </Link>
                </div>

                <div className="text-center text-xs mt-4">
                    <Link href="/" className="text-slate-500 hover:text-white flex items-center justify-center gap-1">
                        <ArrowLeft size={12} /> Volver al Inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
