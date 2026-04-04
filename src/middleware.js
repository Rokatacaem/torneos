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
    // Localhost / Development: we can use the folder structure or subdomains if configured
    // Production: slug.domain.com
    
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    let slug = '';

    // Simple subdomain detection logic (excluding common ones)
    if (hostname !== rootDomain && !hostname.includes('vercel.app')) {
        slug = hostname.split('.')[0];
    }
    
    // Note: If on Vercel preview or main app domain, slug will be empty here.
    // This allows root routes (like /admin) to handle their own data/redirects.

    // 2. Auth Logic
    const cookie = req.cookies.get('session')?.value;
    const session = await decrypt(cookie);

    // Filter paths for Rewriting vs Global
    const isPublicAsset = path.includes('.') || path.startsWith('/api') || path.startsWith('/_next') || path.startsWith('/favicon');
    const isGlobal = isPublicAsset || path === '/login' || path === '/register';

    // 3. SaaS Rewriting
    // If we have a slug, we rewrite everything non-global to /_tenant/[slug]/path
    if (slug && !isGlobal) {
        
        // 4. Protection Layer inside Tenant
        const protectedTenantRoutes = ['/admin', '/referee', '/mi-perfil'];
        const isProtectedRoute = protectedTenantRoutes.some(r => path.startsWith(r));

        if (isProtectedRoute && !session?.userId) {
            return NextResponse.redirect(new URL('/login', req.url));
        }

        // Multi-tenant Security: Check if user belongs to this tenant if accessing /admin
        // Note: clubId in session should match the slug-based tenant id (optional, but recommended)
        // If they are admin for Club A, they shouldn't access Club B's /admin.
        if (path.startsWith('/admin')) {
            const allowedRoles = ['admin', 'superadmin', 'delegate'];
            if (!allowedRoles.includes(session?.role)) {
                 return NextResponse.redirect(new URL('/', req.url));
            }
            // TODO: Cross-verify session.clubId with slug if possible via cache/header
        }

        return NextResponse.rewrite(new URL(`/_tenant/${slug}${path}`, req.url));
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
