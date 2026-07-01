import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { getOtp, incrementOtpAttempts, deleteOtp } from "@/lib/otp";
import { upsertUserWithPassword } from "@/db/queries/users";
import { hashPassword, isPasswordStrongEnough } from "@/lib/password";
import { getJwtSecret } from "@/lib/jwt";
import { createLogger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/redis";

const log = createLogger("verify-otp");

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Verifies an emailed OTP and sets the account password. Serves both flows that
 * require email ownership proof:
 *   - signup: creates the account with the chosen password (name supplied)
 *   - password reset: overwrites the existing account's password
 * On success the user is signed in.
 */
export async function POST(request: Request) {
  try {
    // Throttle verification attempts per IP (complements the per-OTP 3-try lock).
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const rl = await checkRateLimit(`otp-verify:${ip}`, { requests: 10, window: "5 m" });
    if (rl?.limited) {
      return Response.json(
        { error: "Too many attempts. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email: string = (body.email ?? "").toLowerCase().trim();
    const inputOtp: string = (body.otp ?? "").trim();
    const password: string = body.password ?? "";

    if (!isPasswordStrongEnough(password)) {
      return Response.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const entry = await getOtp(email);

    if (!entry) {
      return Response.json(
        { error: "No code found for this email. Please request a new one." },
        { status: 400 }
      );
    }

    if (Date.now() > entry.expiresAt) {
      await deleteOtp(email);
      return Response.json(
        { error: "Code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (entry.attempts >= 3) {
      await deleteOtp(email);
      return Response.json(
        { error: "Too many incorrect attempts. Please request a new code." },
        { status: 429 }
      );
    }

    if (!safeEqual(entry.otp, inputOtp)) {
      await incrementOtpAttempts(email);
      const remaining = 3 - (entry.attempts + 1);
      return Response.json(
        {
          error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
        },
        { status: 401 }
      );
    }

    await deleteOtp(email);

    // OTP proven — persist the hashed password (creating the account if needed).
    const passwordHash = await hashPassword(password);
    const user = await upsertUserWithPassword(email, passwordHash, entry.name ?? body.name);

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
    return Response.json({ error: "Verification failed. Please try again." }, { status: 500 });
  }
}
