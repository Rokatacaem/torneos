import ChangePasswordForm from '@/app/components/admin/ChangePasswordForm';
import { cookies } from 'next/headers';
import { decrypt } from '@/app/lib/session';

export default async function ProfilePage() {
    const sessionCookie = (await cookies()).get('session')?.value;
    const session = await decrypt(sessionCookie);

    return (
        <div>
            <h1 className="text-3xl font-bold text-foreground mb-8">Mi Perfil</h1>
            <ChangePasswordForm />
        </div>
    );
}
