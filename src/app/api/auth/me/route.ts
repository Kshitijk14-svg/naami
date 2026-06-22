import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { Role } from '@/models/roles';
import { getUser } from '@/models/userStore';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('naami_session')?.value;

    if (!token) {
      return Response.json({ authenticated: false }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, getJwtSecret());
    const email = payload.email as string;
    const user = getUser(email);

    return Response.json({
      authenticated: true,
      email,
      name: user?.name,
      role: payload.role as Role,
    });
  } catch {
    return Response.json({ authenticated: false }, { status: 401 });
  }
}
