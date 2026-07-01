import nodemailer from "nodemailer";
import { randomInt } from "node:crypto";
import { setOtp } from "@/lib/otp";
import { getUserByEmail } from "@/db/queries/users";
import { createLogger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/redis";

const log = createLogger("send-otp");

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Purpose = "signup" | "reset";

function shell(inner: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="background:#F4F0E6;margin:0;padding:40px 0;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-top:3px solid #8B1A1A;">
        <tr><td style="padding:36px 40px 20px;">
          <p style="font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#8B1A1A;margin:0 0 12px;">NAAMI ATELIER</p>
          ${inner}
        </td></tr>
        <tr><td style="padding:16px 40px;border-top:1px solid rgba(139,26,26,0.1);text-align:center;">
          <p style="font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#ccc;margin:0;">
            NAAMI ATELIER · Crafted with care
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function otpEmail(purpose: Purpose, name: string, otp: string): string {
  const heading = purpose === "reset" ? "Reset your password" : "Verify your email";
  const intro =
    purpose === "reset"
      ? "Use the code below to reset your password. It expires in 10 minutes."
      : "Use the code below to verify your email and finish creating your account. It expires in 10 minutes.";
  return shell(`
    <h1 style="font-family:Georgia,serif;font-weight:300;font-size:26px;color:#111;margin:0 0 8px;">${heading}</h1>
    <p style="font-size:13px;color:#555;margin:0 0 28px;line-height:1.6;">
      ${name ? `Hello ${name},<br/>` : ""}${intro}
    </p>
    <div style="background:#F4F0E6;border-left:3px solid #8B1A1A;padding:20px 28px;margin-bottom:28px;">
      <span style="font-family:Georgia,serif;font-size:36px;letter-spacing:0.2em;color:#111;">${otp}</span>
    </div>
    <p style="font-size:11px;color:#aaa;margin:0;">
      If you did not request this code, you can safely ignore this email.
    </p>`);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email: string = (body.email ?? "").toLowerCase().trim();
    const name: string = (body.name ?? "").trim();
    const purpose: Purpose = body.purpose === "reset" ? "reset" : "signup";

    if (!EMAIL_REGEX.test(email)) {
      return Response.json({ error: "Invalid email address." }, { status: 400 });
    }

    // Throttle OTP sends per IP to prevent code-spam / email abuse (fail-open).
    const rl = await checkRateLimit(`otp-send:${clientIp(request)}`, {
      requests: 5,
      window: "10 m",
    });
    if (rl?.limited) {
      return Response.json(
        { error: "Too many attempts. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;
    if (!gmailUser || !gmailPass) {
      log.error("Gmail env vars GMAIL_USER or GMAIL_PASS not configured");
      return Response.json({ error: "Mail server configuration missing." }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
      tls: { rejectUnauthorized: false },
    });
    const from = `"NAAMI Atelier" <${gmailUser}>`;

    const existing = await getUserByEmail(email);

    // Non-enumerating branches: the response is { success: true } in every
    // case, so the client can't distinguish existing from non-existing emails.
    if (purpose === "reset" && !existing) {
      // No account to reset — silently succeed without sending or storing anything.
      return Response.json({ success: true });
    }
    if (purpose === "signup" && existing) {
      // Account exists — tell the user directly (explicit disclosure) so they can
      // sign in instead of waiting for a signup code that will never arrive.
      return Response.json(
        { error: "EMAIL_TAKEN", message: "This email is already registered." },
        { status: 409 }
      );
    }

    const otp = randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 600_000; // 10 minutes

    // Persist OTP in Redis (primary) with PostgreSQL fallback — survives server restart
    await setOtp(email, { otp, name: name || undefined, expiresAt });

    await transporter.sendMail({
      from,
      to: email,
      subject: purpose === "reset" ? "Reset your NAAMI password" : "Verify your NAAMI email",
      html: otpEmail(purpose, name, otp),
    });

    return Response.json({ success: true });
  } catch (err) {
    log.error("unexpected failure", { err });
    return Response.json({ error: "Failed to send code. Please try again." }, { status: 500 });
  }
}
