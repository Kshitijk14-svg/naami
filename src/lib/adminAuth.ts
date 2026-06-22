import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { Role } from '@/models/roles';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function verifyAdminRequest(
  request: NextRequest,
  allowedRoles: Role[]
): Promise<{ email: string; role: Role } | Response> {
  try {
    const token = request.cookies.get('naami_session')?.value;
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, getJwtSecret());
    const email = payload.email as string;
    const role = payload.role as Role;

    if (!allowedRoles.includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    return { email, role };
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
