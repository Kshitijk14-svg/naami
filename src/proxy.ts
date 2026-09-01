import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { Role, ROLE_REDIRECT } from '@/models/roles';
import { getJwtSecret } from '@/lib/jwt';

async function getSessionPayload(request: NextRequest): Promise<{ email: string; role: Role } | null> {
  const token = request.cookies.get('naami_session')?.value;
  if (!token) return null;
  try {
    // getJwtSecret() throws when JWT_SECRET is unset. This file used to fall
    // back to an empty string while lib/jwt.ts and lib/adminAuth.ts both threw;
    // one shared implementation keeps a misconfigured deploy from behaving
    // differently at the edge than it does in the API routes.
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });
    return { email: payload.email as string, role: payload.role as Role };
  } catch {
    return null;
  }
}

const ADMIN_ROLES: Role[] = ['staff', 'admin', 'super_admin'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin and sub-routes
  if (pathname.startsWith('/admin')) {
    const session = await getSessionPayload(request);

    if (!session) {
      const loginUrl = new URL('/auth', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!ADMIN_ROLES.includes(session.role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  }

  // Protect /orders and /profile — any signed-in user. Per-order ownership is
  // enforced by the /api/orders route + query layer; this just blocks anonymous
  // access so the page shell never renders for a logged-out visitor.
  if (pathname.startsWith('/orders') || pathname.startsWith('/profile')) {
    const session = await getSessionPayload(request);
    if (!session) {
      const loginUrl = new URL('/auth', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Redirect already-authenticated users away from /auth
  if (pathname === '/auth') {
    const session = await getSessionPayload(request);
    if (session) {
      return NextResponse.redirect(new URL(ROLE_REDIRECT[session.role], request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/orders/:path*', '/profile/:path*', '/auth'],
};
