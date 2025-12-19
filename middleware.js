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

    // 4.5 ROLE BASED PROTECTION
    // Prevent non-admins from accessing /admin
    if (path.startsWith('/admin') && session?.role !== 'admin') {
        if (session?.role === 'referee') return NextResponse.redirect(new URL('/referee', req.nextUrl));
        if (session?.role === 'player') return NextResponse.redirect(new URL('/mi-perfil', req.nextUrl));
        return NextResponse.redirect(new URL('/', req.nextUrl));
    }
    // Prevent players/referees from accessing each other's protected areas? (optional, but good practice)
    if (path.startsWith('/referee') && session?.role !== 'referee' && session?.role !== 'admin') {
        return NextResponse.redirect(new URL('/login', req.nextUrl)); // Or home
    }


    // 5. Redirect validated users away from Login/Public pages to their Dashboard
    if (
        isPublicRoute &&
        session?.userId &&
        !req.nextUrl.pathname.startsWith('/admin') &&
        req.nextUrl.pathname !== '/'
    ) {
        if (path === '/login') {
            if (session.role === 'admin') return NextResponse.redirect(new URL('/admin', req.nextUrl));
            if (session.role === 'referee') return NextResponse.redirect(new URL('/referee', req.nextUrl));
            if (session.role === 'player') return NextResponse.redirect(new URL('/mi-perfil', req.nextUrl));
        }
    }

    return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
