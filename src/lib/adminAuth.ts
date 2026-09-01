import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { Role } from '@/models/roles';
import { getJwtSecret } from '@/lib/jwt';
import { getUserByEmail } from '@/db/queries/users';

const PRIVILEGED: Role[] = ['staff', 'admin', 'super_admin'];

/**
 * Authorize a request against the session cookie.
 *
 * The JWT carries a `role` claim, but a self-contained 7-day token cannot know
 * that an account was demoted or deactivated an hour ago. So whenever the token
 * claims a privileged role, the role is re-read from the database and that is
 * what gets authorized. Revoking staff access now takes effect immediately
 * instead of whenever the token happens to expire.
 *
 * Plain customers keep the token-only fast path: every customer-facing route
 * already loads the user itself (and getUserByEmail filters soft-deleted rows),
 * so a deactivated customer is refused there anyway.
 */
export async function verifyAdminRequest(
  request: NextRequest,
  allowedRoles: Role[]
): Promise<{ email: string; role: Role } | Response> {
  try {
    const token = request.cookies.get('naami_session')?.value;
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });
    const email = payload.email as string;
    let role = payload.role as Role;

    if (PRIVILEGED.includes(role)) {
      // getUserByEmail excludes soft-deleted accounts, so a deactivated admin
      // resolves to null here and is refused.
      const user = await getUserByEmail(email);
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      role = user.role;
    }

    if (!allowedRoles.includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    return { email, role };
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/**
 * Same check for server components, which have no NextRequest. Returns the
 * session or null; callers decide whether to redirect or render nothing.
 */
export async function verifyAdminSession(
  token: string | undefined,
  allowedRoles: Role[]
): Promise<{ email: string; role: Role } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });
    const email = payload.email as string;
    let role = payload.role as Role;

    if (PRIVILEGED.includes(role)) {
      const user = await getUserByEmail(email);
      if (!user) return null;
      role = user.role;
    }

    return allowedRoles.includes(role) ? { email, role } : null;
  } catch {
    return null;
  }
}
