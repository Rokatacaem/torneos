'use client';

import { useState } from 'react';
import { updatePlayerProfile } from '@/app/lib/player-actions';

export default function ProfileEditor({ profile, clubs }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData) {
        setIsLoading(true);
        try {
            await updatePlayerProfile(formData);
            setIsEditing(false);
            // Optional: Show toast
        } catch (error) {
            console.error(error);
            alert('Error al actualizar perfil');
        } finally {
            setIsLoading(false);
        }
    }

    if (!isEditing) {
        return (
            <button
                onClick={() => setIsEditing(true)}
                className="mt-4 text-sm text-blue-400 hover:text-blue-300 underline"
            >
                Editar Perfil
            </button>
        );
    }

    return (
        <form action={handleSubmit} className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700 animate-in fade-in space-y-4">

            {/* Club Selection */}
            <div>
                <label className="block text-xs text-slate-400 mb-1">Club</label>
                <select
                    name="club_id"
                    defaultValue={profile.club_id || ''}
                    className="w-full bg-slate-800 border-slate-700 text-white rounded p-2 text-sm"
                >
                    <option value="">Seleccionar Club</option>
                    {clubs.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Photo Upload */}
            <div>
                <label className="block text-xs text-slate-400 mb-1">Foto de Perfil</label>
                <input
                    type="file"
                    name="photo"
                    accept="image/*"
                    className="w-full text-slate-400 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900 file:text-blue-400 hover:file:bg-blue-800"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                    Nota: La imagen puede tardar unos segundos en actualizarse.
                </p>
            </div>

            <div className="flex gap-2 justify-end">
                <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded font-bold disabled:opacity-50"
                >
                    {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </form>
    );
}
