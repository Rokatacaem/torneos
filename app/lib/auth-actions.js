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

        if (user.role === 'player') {
            redirect('/mi-perfil');
        } else {
            // Admin, Superadmin, Delegate, Referee -> Admin Dashboard (or specific if needed)
            // Note: Referee has a specific redirect in middleware if they hit /admin, but here we can send them to /admin 
            // and let middleware handle it, or send them directly.
            // But for now, let's keep it simple: Everyone else goes to /admin
            redirect('/admin');
        }
    } catch (error) {
        if (error.message === 'NEXT_REDIRECT') throw error;
        console.error('[Login Error] Exception:', error);
        return { error: 'An error occurred. Please try again.' };
    }
}

export async function registerPlayer(prevState, formData) {
    const name = formData.get('name');
    const email = formData.get('email');
    const username = formData.get('username'); // optional? or use email? let's require username for now as per DB
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (!name || !username || !password || !confirmPassword) {
        return { error: 'Todos los campos son obligatorios' };
    }

    if (password !== confirmPassword) {
        return { error: 'Las contraseñas no coinciden' };
    }

    // Import hashPassword dynamically to avoid top-level issues if any? No, static import is fine usually.
    // actually imports are already at top.
    const { hashPassword } = await import('@/app/lib/auth');

    try {
        // 1. Check if user exists
        const userCheck = await query('SELECT id FROM users WHERE name = $1 OR email = $2', [username, email]);
        if (userCheck.rows.length > 0) {
            return { error: 'El usuario o correo ya está registrado' };
        }

        // 2. Hash Password
        const hashed = await hashPassword(password);

        // 3. Find or Create Player Profile
        // Strategy: Match by Name (Exact, Case Insensitive)
        let playerId = null;
        const playerCheck = await query('SELECT id FROM players WHERE name ILIKE $1', [name.trim()]);

        if (playerCheck.rows.length > 0) {
            // Found existing player profile! Link it.
            playerId = playerCheck.rows[0].id;
            console.log(`[Register] Linked to existing player: ${name} (${playerId})`);
        } else {
            // Create new player profile
            const newPlayer = await query('INSERT INTO players (name) VALUES ($1) RETURNING id', [name.trim()]);
            playerId = newPlayer.rows[0].id;
            console.log(`[Register] Created new player profile: ${name} (${playerId})`);
        }

        // 4. Create User
        await query(`
            INSERT INTO users (name, email, password_hash, role, player_id)
            VALUES ($1, $2, $3, 'player', $4)
        `, [username, email, hashed, playerId]);

        // 5. Auto Login? or Redirect to Login?
        // Let's redirect to login for simplicity and security flow (verify email later?)
        // Or auto-login. Let's auto-login!

        // Actually, for now just redirect to login with success message?
    } catch (e) {
        console.error('Registration Error:', e);
        return { error: 'Error al registrar usuario.' };
    }

    redirect('/login?registered=true');
}

export async function logoutAction() {
    await import('@/app/lib/auth').then(m => m.logout());
    redirect('/login');
}
