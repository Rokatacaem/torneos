'use client';

import { Download } from 'lucide-react';

export default function ExportRankingButton() {
    return (
        <button
            onClick={() => window.location.href = '/api/admin/players/export'}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
        >
            <Download className="h-4 w-4" />
            Exportar Ranking
        </button>
    );
}
