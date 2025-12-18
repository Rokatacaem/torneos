import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function formatDate(date) { return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

// Fechillar Handicap Logic
export function calculateFechillarHandicap(average) {
    if (!average || average < 0) return 0; // Default or no handicap
    if (average < 0.250) return 18;
    if (average < 0.400) return 20;
    if (average < 0.550) return 22;
    if (average < 0.700) return 24; // 0.699 limit
    if (average < 0.850) return 26;
    return 28; // >= 0.850
}
