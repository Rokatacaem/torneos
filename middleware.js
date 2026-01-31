import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || 'default-secret-key-change-it';
const key = new TextEncoder().encode(secretKey);

async function decrypt(input) {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

// 1. Specify protected and public routes
const protectedRoutes = ['/admin', '/mi-perfil'];
const publicRoutes = ['/login', '/tournaments', '/', '/referee'];

export default async function middleware(req) {
    // 2. Check if the current route is protected or public
    const path = req.nextUrl.pathname;
    const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
    const isPublicRoute = publicRoutes.includes(path) || path.startsWith('/referee');

    // 3. Decrypt the session from the cookie
    const cookie = req.cookies.get('session')?.value;
    const session = await decrypt(cookie);

    // 4. Redirect to /login if the user is not authenticated
    if (isProtectedRoute && !session?.userId) {
        return NextResponse.redirect(new URL('/login', req.nextUrl));
    }

    // 4.5 ROLE BASED PROTECTION
    // Prevent non-admins from accessing /admin
    if (path.startsWith('/admin')) {
        const allowedRoles = ['admin', 'superadmin', 'delegate'];
        if (!allowedRoles.includes(session?.role)) {
            if (session?.role === 'referee') return NextResponse.redirect(new URL('/referee', req.nextUrl));
            if (session?.role === 'player') return NextResponse.redirect(new URL('/mi-perfil', req.nextUrl));
            return NextResponse.redirect(new URL('/', req.nextUrl));
        }
    }
    // Prevent players/referees from accessing each other's protected areas? (optional, but good practice)


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
