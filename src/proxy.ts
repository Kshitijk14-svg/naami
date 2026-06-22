import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { Role, ROLE_REDIRECT } from '@/models/roles';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? '';
  return new TextEncoder().encode(secret);
}

async function getSessionPayload(request: NextRequest): Promise<{ email: string; role: Role } | null> {
  const token = request.cookies.get('naami_session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
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
  matcher: ['/admin/:path*', '/auth'],
};
