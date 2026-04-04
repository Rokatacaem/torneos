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

    // 1. Detect Slug from Subdomain
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    let subdomainSlug = '';

    if (hostname !== rootDomain && !hostname.includes('vercel.app')) {
        subdomainSlug = hostname.split('.')[0];
    }
    
    // 2. Normalization: Redirect /admin/dashboard to /admin
    if (path.endsWith('/admin/dashboard')) {
        const newPath = path.replace('/admin/dashboard', '/admin');
        return NextResponse.redirect(new URL(newPath, req.url));
    }

    // 3. Auth Logic
    const cookie = req.cookies.get('session')?.value;
    const session = await decrypt(cookie);

    // 4. Subdomain to Path Rewrite (NATIVE SaaS Strategy)
    // If we have a subdomain, we rewrite host.com/path internally to /slug/path
    // Next.js will find /(tenant)/[slug]/...
    if (subdomainSlug) {
        const isPublicAsset = path.includes('.') || path.startsWith('/api') || path.startsWith('/_next') || path.startsWith('/favicon');
        if (!isPublicAsset) {
             return NextResponse.rewrite(new URL(`/${subdomainSlug}${path}`, req.url));
        }
    }

    // 5. Global Access Protection (Non-Subdomain or Default Path)
    const protectedRoutes = ['/admin', '/mi-perfil', '/referee'];
    const isProtectedRoute = protectedRoutes.some((route) => path.includes(route));

    if (isProtectedRoute && !session?.userId) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
