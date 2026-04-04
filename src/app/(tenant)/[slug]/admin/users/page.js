import { getUsers, getClubsList } from '@/app/lib/user-actions';
import UserManager from '@/app/components/admin/UserManager';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    // Session is handled by Middleware/Layout

    const users = await getUsers();
    const clubs = await getClubsList();

    return (
        <UserManager users={users} clubs={clubs} />
    );
}
