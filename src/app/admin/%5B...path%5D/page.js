import { getSession } from '@/app/lib/session';
import { getClubById } from '@/app/lib/tournament-actions';
import { redirect } from 'next/navigation';

export default async function AdminCatchAllPage({ params }) {
    const session = await getSession();
    const { path } = await params; // Current path segments after /admin/

    if (!session || !['admin', 'superadmin', 'delegate'].includes(session.role)) {
        redirect('/login');
    }

    if (session.clubId) {
        const club = await getClubById(session.clubId);
        if (club && club.slug) {
            const extraPath = path && path.length > 0 ? path.join('/') : '';
            // Redirect to the tenant-specific equivalent
            // Example: /admin/tournaments/1 -> /[slug]/admin/tournaments/1
            const destination = `/${club.slug}/admin${extraPath ? `/${extraPath}` : ''}`;
            console.log(`[Admin CatchAll] Redirecting to: ${destination}`);
            redirect(destination);
        }
    }

    // Default fallback
    redirect('/admin/manual-setup');
}
