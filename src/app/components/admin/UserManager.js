'use client';

import { useState } from 'react';
import { createUser, updateUserRole, resetUserPassword, deleteUser } from '@/app/lib/user-actions';
import { useRouter } from 'next/navigation';

export default function UserManager({ users, clubs }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Modals
    const [showCreate, setShowCreate] = useState(false);
    const [userToReset, setUserToReset] = useState(null);
    const [userToEdit, setUserToEdit] = useState(null);

    // Helper state for conditional UI
    const [selectedRole, setSelectedRole] = useState('viewer');

    // Create User Handler
    async function handleCreate(e) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);

        const res = await createUser(formData);
        setLoading(false);

        if (res.success) {
            setShowCreate(false);
            e.target.reset();
            router.refresh();
        } else {
            alert(res.message || 'Error al crear usuario');
        }
    }

    // Reset Password Handler
    async function handleReset(e) {
        e.preventDefault();
        if (!userToReset) return;
        setLoading(true);
        const formData = new FormData(e.target);

        const res = await resetUserPassword(userToReset.id, formData);
        setLoading(false);

        if (res.success) {
            setUserToReset(null);
            alert('Contraseña restablecida correctamente');
        } else {
            alert(res.message || 'Error al restablecer contraseña');
        }
    }

    // Edit Role Handler
    async function handleEditRole(e) {
        e.preventDefault();
        if (!userToEdit) return;
        setLoading(true);
        const formData = new FormData(e.target);

        const res = await updateUserRole(userToEdit.id, formData);
        setLoading(false);

        if (res.success) {
            setUserToEdit(null);
            router.refresh();
        } else {
            alert(res.message || 'Error al actualizar rol');
        }
    }

    async function handleDelete(id) {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
        setLoading(true);
        const res = await deleteUser(id);
        setLoading(false);
        if (res.success) {
            router.refresh();
        } else {
            alert(res.message);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Usuarios y Accesos</h2>
                <button
                    onClick={() => { setShowCreate(true); setSelectedRole('viewer'); }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-900/20"
                >
                    + Nuevo Usuario
                </button>
            </div>

            <div className="bg-[#0B1120] border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-white/5 text-slate-200 uppercase text-xs font-semibold">
                        <tr>
                            <th className="px-6 py-4">Usuario</th>
                            <th className="px-6 py-4">Club</th>
                            <th className="px-6 py-4">Rol</th>
                            <th className="px-6 py-4">Creado</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-medium text-white">
                                    {u.name}
                                    <div className="text-xs text-slate-500">{u.email || '-'}</div>
                                </td>
                                <td className="px-6 py-4 text-slate-400">{u.club_name || '-'}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-900/30 text-purple-400 border border-purple-500/20' :
                                            u.role === 'delegate' ? 'bg-green-900/30 text-green-400 border border-green-500/20' :
                                                'bg-slate-800 text-slate-400 border border-white/10'
                                        }`}>
                                        {u.role === 'delegate' ? 'DELEGADO' : u.role.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button
                                        onClick={() => setUserToReset(u)}
                                        className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                                    >
                                        Clave
                                    </button>
                                    <span className="text-slate-700">|</span>
                                    <button
                                        onClick={() => { setUserToEdit(u); setSelectedRole(u.role); }}
                                        className="text-xs text-yellow-400 hover:text-yellow-300 font-medium"
                                    >
                                        Editar
                                    </button>
                                    <span className="text-slate-700">|</span>
                                    <button
                                        onClick={() => handleDelete(u.id)}
                                        className="text-xs text-red-400 hover:text-red-300 font-medium"
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                        No hay usuarios registrados.
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0B1120] w-full max-w-md rounded-2xl border border-white/10 p-6">
                        <h3 className="text-xl font-bold text-white mb-6">Nuevo Usuario</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nombre de Usuario</label>
                                <input name="name" required className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" placeholder="jdoe" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email (Opcional)</label>
                                <input name="email" type="email" className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" placeholder="jdoe@example.com" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Rol</label>
                                <select
                                    name="role"
                                    className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none"
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    value={selectedRole}
                                >
                                    <option value="viewer">Viewer (Solo lectura)</option>
                                    <option value="delegate">Delegado Deportivo</option>
                                    <option value="admin">Admin (Acceso total)</option>
                                </select>
                            </div>

                            {selectedRole === 'delegate' && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">Club Asignado</label>
                                    <select name="clubId" required className="w-full bg-[#131B2D] border border-green-500/30 rounded-lg h-10 px-3 text-white focus:border-green-500 outline-none">
                                        <option value="">-- Seleccionar Club --</option>
                                        {clubs.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Contraseña Temporal</label>
                                <input name="password" required className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" placeholder="temporal123" />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2 text-slate-400 hover:text-white">Cancelar</button>
                                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white rounded-lg font-bold py-2 hover:bg-blue-500">Crear</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {userToReset && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0B1120] w-full max-w-sm rounded-2xl border border-white/10 p-6">
                        <h3 className="text-xl font-bold text-white mb-2">Resetear Clave</h3>
                        <p className="text-sm text-slate-400 mb-6">Establece una contraseña temporal para <strong>{userToReset.name}</strong>.</p>
                        <form onSubmit={handleReset} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nueva Contraseña</label>
                                <input name="password" required className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none" placeholder="temporal123" />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setUserToReset(null)} className="flex-1 py-2 text-slate-400 hover:text-white">Cancelar</button>
                                <button type="submit" disabled={loading} className="flex-1 bg-yellow-600 text-white rounded-lg font-bold py-2 hover:bg-yellow-500">Resetear</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Role Modal */}
            {userToEdit && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0B1120] w-full max-w-sm rounded-2xl border border-white/10 p-6">
                        <h3 className="text-xl font-bold text-white mb-6">Editar Rol</h3>
                        <form onSubmit={handleEditRole} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Rol Asignado</label>
                                <select
                                    name="role"
                                    defaultValue={userToEdit.role}
                                    className="w-full bg-[#131B2D] border border-white/10 rounded-lg h-10 px-3 text-white focus:border-blue-500 outline-none"
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                >
                                    <option value="viewer">Viewer (Solo lectura)</option>
                                    <option value="delegate">Delegado Deportivo</option>
                                    <option value="admin">Admin (Acceso total)</option>
                                </select>
                            </div>

                            {selectedRole === 'delegate' && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">Club Asignado</label>
                                    <select name="clubId" defaultValue={userToEdit.club_id} required className="w-full bg-[#131B2D] border border-green-500/30 rounded-lg h-10 px-3 text-white focus:border-green-500 outline-none">
                                        <option value="">-- Seleccionar Club --</option>
                                        {clubs.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setUserToEdit(null)} className="flex-1 py-2 text-slate-400 hover:text-white">Cancelar</button>
                                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white rounded-lg font-bold py-2 hover:bg-blue-500">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
