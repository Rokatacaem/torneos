import { NextResponse } from 'next/server';
import { decrypt } from '@/app/lib/auth';
import { cookies } from 'next/headers';

// 1. Specify protected and public routes
const protectedRoutes = ['/admin', '/referee', '/mi-perfil'];
const publicRoutes = ['/login', '/tournaments', '/'];

export default async function middleware(req) {
    // 2. Check if the current route is protected or public
    const path = req.nextUrl.pathname;
    const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
    const isPublicRoute = publicRoutes.includes(path);

    // 3. Decrypt the session from the cookie
    const cookie = (await cookies()).get('session')?.value;
    const session = await decrypt(cookie);

    // 4. Redirect to /login if the user is not authenticated
    if (isProtectedRoute && !session?.userId) {
        return NextResponse.redirect(new URL('/login', req.nextUrl));
    }

    // 5. Redirect to /admin if the user is authenticated and tries to access login
    if (
        isPublicRoute &&
        session?.userId &&
        !req.nextUrl.pathname.startsWith('/admin') &&
        req.nextUrl.pathname !== '/' // Allow visiting home, but login should skip to admin
    ) {
        if (path === '/login') {
            return NextResponse.redirect(new URL('/admin', req.nextUrl));
        }
    }

    return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
