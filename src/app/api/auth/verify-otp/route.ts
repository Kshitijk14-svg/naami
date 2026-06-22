import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'node:crypto';
import otpStore from '@/lib/otpStore';
import { getOrCreateUser } from '@/models/userStore';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email: string = (body.email ?? '').toLowerCase().trim();
    const inputOtp: string = (body.otp ?? '').trim();

    const entry = otpStore.get(email);

    if (!entry) {
      return Response.json({ error: 'No code found for this email. Please request a new one.' }, { status: 400 });
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(email);
      return Response.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 });
    }

    if (entry.attempts >= 3) {
      otpStore.delete(email);
      return Response.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 429 });
    }

    if (!safeEqual(entry.otp, inputOtp)) {
      entry.attempts += 1;
      const remaining = 3 - entry.attempts;
      return Response.json(
        { error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` },
        { status: 401 }
      );
    }

    const entryName = entry.name;
    otpStore.delete(email);

    const user = getOrCreateUser(email, entryName);

    const token = await new SignJWT({ email: user.email, role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(getJwtSecret());

    const cookieStore = await cookies();
    cookieStore.set('naami_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return Response.json({ success: true, role: user.role });
  } catch (err) {
    console.error('[verify-otp]', err);
    return Response.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
