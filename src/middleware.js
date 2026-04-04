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

export default async function middleware(req) {
    const url = req.nextUrl;
    const hostname = req.headers.get('host') || '';
    const path = url.pathname;

    // 1. Detect Tenant (Slug) from Subdomain or Path
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    let slug = '';

    // Subdomain detection logic
    if (hostname !== rootDomain && !hostname.includes('vercel.app')) {
        slug = hostname.split('.')[0];
    }
    
    // Path segment detection logic (if no subdomain slug found)
    const pathSegments = path.split('/').filter(Boolean);
    const reservedSegments = ['admin', 'api', 'login', 'register', 'ranking', 'clubs', 'components', '_next', 'favicon.ico'];
    
    let actualPath = path;

    if (!slug && pathSegments.length > 0 && !reservedSegments.includes(pathSegments[0])) {
        slug = pathSegments[0];
        actualPath = '/' + pathSegments.slice(1).join('/');
    }

    // Redirect /admin/dashboard to /admin to avoid structure mismatches
    if (actualPath === '/admin/dashboard') {
        actualPath = '/admin';
    }

    // 2. Auth Logic
    const cookie = req.cookies.get('session')?.value;
    const session = await decrypt(cookie);

    // Filter paths for Global Routes (don't rewrite these)
    const isPublicAsset = path.includes('.') || path.startsWith('/api') || path.startsWith('/_next') || path.startsWith('/favicon');
    const isGlobal = isPublicAsset || path === '/login' || path === '/register' || reservedSegments.includes(pathSegments[0]) && !slug;

    // 3. SaaS Rewriting
    // If we have a slug, we rewrite to /_tenant/[slug]/path
    if (slug && !isGlobal) {
        
        // 4. Protection Layer inside Tenant
        const protectedTenantRoutes = ['/admin', '/referee', '/mi-perfil'];
        const isProtectedRoute = protectedTenantRoutes.some(r => actualPath.startsWith(r));

        if (isProtectedRoute && !session?.userId) {
            return NextResponse.redirect(new URL('/login', req.url));
        }

        // Multi-tenant Security Check
        if (actualPath.startsWith('/admin')) {
            const allowedRoles = ['admin', 'superadmin', 'delegate'];
            if (!allowedRoles.includes(session?.role)) {
                 return NextResponse.redirect(new URL('/', req.url));
            }
        }

        // Internal rewrite to the _tenant folder hierarchy
        const rewriteUrl = new URL(`/_tenant/${slug}${actualPath}`, req.url);
        return NextResponse.rewrite(rewriteUrl);
    }

    // Default Fallback: Standard Authentication for Global Routes
    const protectedRoutes = ['/admin', '/mi-perfil', '/referee'];
    const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));

    if (isProtectedRoute && !session?.userId) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
