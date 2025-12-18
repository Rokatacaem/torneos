'use client';

import { useActionState } from 'react';
import { login } from '@/app/lib/auth-actions';
import { cn } from '@/app/lib/utils'; // Assuming this exists, based on previous file reads

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(login, null);

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100">
            <div className="w-full max-w-sm p-8 space-y-6 bg-slate-900 rounded-lg shadow-lg border border-slate-800">
                <div className="text-center">
                    <h1 className="text-2xl font-bold tracking-tight text-white">Torneos Admin</h1>
                    <p className="mt-2 text-sm text-slate-400">Sign in to your account</p>
                </div>

                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="username" className="text-sm font-medium text-slate-200">
                            Username
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            required
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 placeholder-slate-500"
                            placeholder="admin"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-slate-200">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100"
                            placeholder="••••••••"
                        />
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
                        {isPending ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
