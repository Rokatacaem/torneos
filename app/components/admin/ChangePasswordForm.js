'use client';

import { useState } from 'react';
import { changeOwnPassword } from '@/app/lib/user-actions';

export default function ChangePasswordForm() {
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setMsg(null);

        const formData = new FormData(e.target);

        // Basic Client Validation
        if (formData.get('newPassword') !== formData.get('confirmPassword')) {
            setLoading(false);
            setMsg({ type: 'error', text: 'Las contraseñas no coinciden' });
            return;
        }

        const res = await changeOwnPassword(formData);

        setLoading(false);
        if (res.success) {
            setMsg({ type: 'success', text: res.message });
            e.target.reset();
        } else {
            setMsg({ type: 'error', text: res.message });
        }
    }

    return (
        <div className="bg-[#0B1120] border border-white/5 rounded-xl p-8 max-w-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Cambiar Contraseña</h2>

            {msg && (
                <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${msg.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-500/20' : 'bg-red-900/30 text-red-400 border border-red-500/20'}`}>
                    {msg.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Contraseña Actual</label>
                    <input name="currentPassword" type="password" required className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" placeholder="••••••••" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nueva Contraseña</label>
                        <input name="newPassword" type="password" required className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" placeholder="••••••••" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirmar Nueva Contraseña</label>
                        <input name="confirmPassword" type="password" required className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" placeholder="••••••••" />
                    </div>
                </div>

                <div className="pt-4">
                    <button type="submit" disabled={loading} className="bg-blue-600 text-white rounded-lg font-bold px-6 py-2.5 hover:bg-blue-500 shadow-lg shadow-blue-900/20 disabled:opacity-50 transition-all">
                        {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </button>
                </div>
            </form>
        </div>
    );
}
