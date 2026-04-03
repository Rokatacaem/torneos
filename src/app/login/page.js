'use client';

import { useActionState, Suspense, useState } from 'react';
import { login } from '@/app/lib/auth-actions';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
    const [state, formAction, isPending] = useActionState(login, null);
    const [showPassword, setShowPassword] = useState(false);
    const searchParams = useSearchParams();
    const registered = searchParams.get('registered');

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-4">
            <div className="w-full max-w-sm p-8 space-y-6 bg-slate-900 rounded-lg shadow-lg border border-slate-800">
                <div className="text-center">
                    <h1 className="text-2xl font-bold tracking-tight text-white">Iniciar Sesión</h1>
                    <p className="mt-2 text-sm text-slate-400">Accede a tu cuenta FECHILLAR</p>
                </div>

                {registered && (
                    <div className="p-3 text-sm text-green-500 bg-green-950/30 border border-green-900/50 rounded-md text-center">
                        ¡Cuenta creada! Por favor inicia sesión.
                    </div>
                )}

                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="username" className="text-sm font-medium text-slate-200">
                            Usuario
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            required
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 placeholder-slate-600"
                            placeholder="usuario"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-slate-200">
                            Contraseña
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 pr-10"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                tabIndex="-1"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {state?.error && (
                        <div className="p-3 text-sm text-red-500 bg-red-950/30 border border-red-900/50 rounded-md">
                            {state.error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPending ? 'Iniciando...' : 'Entrar'}
                    </button>
                </form>

                <div className="text-center text-sm">
                    <Link href="/register" className="text-blue-400 hover:text-blue-300">
                        ¿No tienes cuenta? Regístrate
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

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <LoginForm />
        </Suspense>
    );
}
