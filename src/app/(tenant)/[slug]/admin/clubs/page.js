
import ClubManager from '@/app/components/admin/ClubManager';
import { getClubs } from '@/app/lib/tournament-actions';

export const dynamic = 'force-dynamic';

export default async function AdminClubsPage() {
    const clubs = await getClubs();

    return (
        <ClubManager clubs={clubs} />
    );
}
