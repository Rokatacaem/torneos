'use client';

import { Trash2 } from 'lucide-react';
import { deleteTournament } from '@/app/lib/tournament-actions';
import { useState } from 'react';
import Modal from '@/app/components/ui/Modal';

export default function DeleteTournamentButton({ id, name }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteTournament(id);
            // Modal confirms close automatically if component unmounts upon deletion, 
            // but for safety we can close it or let redirection handle it.
            setIsModalOpen(false);
        } catch (error) {
            alert('Ocurrió un error al eliminar el torneo.');
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 hover:bg-red-500/10 rounded-md text-red-500 transition-colors"
                title="Eliminar"
            >
                <Trash2 size={18} />
            </button>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="¿Eliminar torneo?"
            >
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Estás a punto de eliminar el torneo <strong>"{name}"</strong>.
                        <br /><br />
                        <span className="text-red-500 font-medium">Esta acción no se puede deshacer.</span>
                        <br />
                        Se eliminarán todos los partidos, grupos y estadísticas asociados para siempre.
                    </p>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
                            disabled={isDeleting}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50"
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
