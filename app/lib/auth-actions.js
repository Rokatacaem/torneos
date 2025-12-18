'use server';

import { query } from '@/app/lib/db';
import { verifyPassword, createSession } from '@/app/lib/auth';
import { redirect } from 'next/navigation';

export async function login(prevState, formData) {
    const username = formData.get('username');
    const password = formData.get('password');

    console.log(`[Login Attempt] Username: ${username}`);

    if (!username || !password) {
        console.log('[Login Failed] Missing fields');
        return { error: 'Username and password are required.' };
    }

    try {
        console.log(`[Login] Querying for user: '${username}'`);
        const result = await query('SELECT * FROM users WHERE name = $1', [username]);
        console.log(`[Login] DB Result RowCount: ${result.rows.length}`);

        const user = result.rows[0];

        if (!user) {
            console.log(`[Login Failed] User '${username}' not found in DB`);
            return { error: 'Invalid credentials.' };
        }

        console.log('[Login] User found:', { id: user.id, name: user.name, role: user.role, hasHash: !!user.password_hash });

        console.log('[Login] User found, verifying password...');
        const passwordsMatch = await verifyPassword(password, user.password_hash);

        if (!passwordsMatch) {
            console.log('[Login Failed] Password mismatch');
            return { error: 'Invalid credentials.' };
        }

        console.log('[Login Success] creating session...');
        // Create session
        await createSession(user.id, user.role, user.club_id);
    } catch (error) {
        console.error('[Login Error] Exception:', error);
        return { error: 'An error occurred. Please try again.' };
    }

    console.log('[Login] Redirecting to /admin');
    redirect('/admin');
}

export async function logoutAction() {
    await import('@/app/lib/auth').then(m => m.logout());
    redirect('/login');
}
