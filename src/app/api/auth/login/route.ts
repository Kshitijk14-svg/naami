import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { getUserByEmail } from "@/db/queries/users";
import { verifyPassword, DUMMY_PASSWORD_HASH } from "@/lib/password";
import { getJwtSecret } from "@/lib/jwt";
import { createLogger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/redis";
import { rateLimitKey } from "@/lib/requestIp";

const log = createLogger("login");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email: string = (body.email ?? "").toLowerCase().trim();
    const password: string = body.password ?? "";

    if (!EMAIL_REGEX.test(email) || !password) {
      return Response.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Throttle password attempts per IP to blunt brute-force (fail-open).
    //
    // The key MUST come from rateLimitKey(). Reading X-Forwarded-For[0] here
    // let the caller pick their own bucket: nginx uses proxy_add_x_forwarded_for,
    // which appends the real peer rather than replacing the header, so the first
    // entry is whatever the client sent. Rotating it bought an unlimited number
    // of fresh buckets — i.e. unmetered password guessing.
    const ip = rateLimitKey(request, email);
    const rl = await checkRateLimit(`login:${ip}`, { requests: 10, window: "5 m" });
    if (rl?.limited) {
      return Response.json(
        { error: "Too many attempts. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const user = await getUserByEmail(email);

    // Single generic failure for every case — wrong password, no such account,
    // or a legacy/passwordless account — so login never reveals which emails
    // exist. The "Forgot password" flow is how passwordless accounts recover.
    //
    // Falling back to DUMMY_PASSWORD_HASH is what actually keeps the timing
    // uniform: verifyPassword() returns early on an absent hash, so passing
    // user?.passwordHash straight through skipped scrypt entirely for unknown
    // accounts and answered ~95ms faster than for a real one. The generic
    // message said nothing; the clock said everything.
    const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !user.passwordHash || !ok) {
      return Response.json(
        { error: "Incorrect email or password." },
        { status: 401 }
      );
    }

    const token = await new SignJWT({ email: user.email, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(getJwtSecret());

    const cookieStore = await cookies();
    cookieStore.set("naami_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return Response.json({ success: true, role: user.role });
  } catch (err) {
    log.error("unexpected failure", { err });
    return Response.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
