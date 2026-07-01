import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { getUserByEmail } from "@/db/queries/users";
import { verifyPassword } from "@/lib/password";
import { getJwtSecret } from "@/lib/jwt";
import { createLogger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/redis";

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
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
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
    // The hash compare runs even when the user is missing to keep timing uniform.
    const ok = await verifyPassword(password, user?.passwordHash);
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
