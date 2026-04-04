import { getSession } from '@/app/lib/session';
import { getClubById } from '@/app/lib/tournament-actions';
import { redirect } from 'next/navigation';

export default async function AdminRootPage() {
    const session = await getSession();

    if (!session || !['admin', 'superadmin', 'delegate'].includes(session.role)) {
        redirect('/login');
    }

    if (session.clubId) {
        const club = await getClubById(session.clubId);
        if (club && club.slug) {
            // Redirect to the tenant-specific admin page
            redirect(`/${club.slug}/admin`);
        }
    }

    // Fallback: If for some reason there is no clubId, or club not found
    // Redirect to a default slug or show a selection if possible.
    // For now, let's redirect to manual-setup if we are in fixing mode.
    redirect('/admin/manual-setup');
}
