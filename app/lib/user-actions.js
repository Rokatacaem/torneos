'use server';

import { query } from '@/app/lib/db';
import { hashPassword, verifyPassword, getSession } from '@/app/lib/auth';
import { revalidatePath } from 'next/cache';

// --- USER MANAGEMENT (ADMIN ONLY) ---

export async function getUsers() {
    const session = await getSession();
    if (!session || !['admin', 'superadmin'].includes(session.role)) {
        throw new Error('Unauthorized');
    }

    // Join with clubs to show club name
    const res = await query(`
        SELECT u.id, u.name, u.email, u.role, u.created_at, u.club_id, c.name as club_name
        FROM users u
        LEFT JOIN clubs c ON u.club_id = c.id
        ORDER BY u.created_at DESC
    `);
    return res.rows;
}

export async function getClubsList() {
    const session = await getSession();
    if (!session || !['admin', 'superadmin'].includes(session.role)) {
        throw new Error('Unauthorized');
    }
    const res = await query('SELECT id, name FROM clubs ORDER BY name ASC');
    return res.rows;
}

export async function createUser(formData) {
    const session = await getSession();
    if (!session || !['admin', 'superadmin'].includes(session.role)) {
        throw new Error('Unauthorized');
    }

    const name = formData.get('name');
    const email = formData.get('email');
    const role = formData.get('role');
    const tempPassword = formData.get('password');
    const clubId = formData.get('clubId') || null;

    if (!name || !tempPassword) {
        return { success: false, message: 'Nombre y contraseña son requeridos' };
    }

    try {
        const hashedPassword = await hashPassword(tempPassword);

        await query(`
            INSERT INTO users (name, email, role, password_hash, club_id)
            VALUES ($1, $2, $3, $4, $5)
        `, [name, email, role, hashedPassword, clubId]);

        revalidatePath('/admin/users');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, message: 'Error creando usuario (posible nombre duplicado)' };
    }
}

export async function updateUserRole(userId, formData) {
    const session = await getSession();
    if (!session || !['admin', 'superadmin'].includes(session.role)) {
        throw new Error('Unauthorized');
    }

    const role = formData.get('role');
    const clubId = formData.get('clubId') || null;

    try {
        await query('UPDATE users SET role = $1, club_id = $2 WHERE id = $3', [role, clubId, userId]);
        revalidatePath('/admin/users');
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

export async function resetUserPassword(userId, formData) {
    const session = await getSession();
    if (!session || !['admin', 'superadmin'].includes(session.role)) {
        throw new Error('Unauthorized');
    }

    const newPassword = formData.get('password');
    if (!newPassword) return { success: false, message: 'Contraseña requerida' };

    try {
        const hashedPassword = await hashPassword(newPassword);
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

export async function deleteUser(userId) {
    const session = await getSession();
    if (!session || !['admin', 'superadmin'].includes(session.role)) {
        throw new Error('Unauthorized');
    }

    // Prevent deleting self?
    if (session.userId === userId) {
        return { success: false, message: 'No puedes eliminarte a ti mismo' };
    }

    try {
        await query('DELETE FROM users WHERE id = $1', [userId]);
        revalidatePath('/admin/users');
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

// --- PROFILE SETTINGS (ANY LOGGED IN USER) ---

export async function changeOwnPassword(formData) {
    const session = await getSession();
    if (!session) {
        return { success: false, message: 'No autenticado' };
    }

    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    if (newPassword !== confirmPassword) {
        return { success: false, message: 'Las contraseñas nuevas no coinciden' };
    }

    try {
        // 1. Get current user hash
        const res = await query('SELECT password_hash FROM users WHERE id = $1', [session.userId]);
        const user = res.rows[0];

        if (!user) return { success: false, message: 'Usuario no encontrado' };

        // 2. Verify current password
        const match = await verifyPassword(currentPassword, user.password_hash);
        if (!match) {
            return { success: false, message: 'La contraseña actual es incorrecta' };
        }

        // 3. Update to new password
        const newHash = await hashPassword(newPassword);
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, session.userId]);

        return { success: true, message: 'Contraseña actualizada correctamente' };
    } catch (e) {
        console.error(e);
        return { success: false, message: 'Error interno al cambiar contraseña' };
    }
}
