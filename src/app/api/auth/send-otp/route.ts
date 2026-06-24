import nodemailer from "nodemailer";
import { randomInt } from "node:crypto";
import { setOtp } from "@/lib/otp";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email: string = (body.email ?? "").toLowerCase().trim();
    const name: string = (body.name ?? "").trim();

    if (!EMAIL_REGEX.test(email)) {
      return Response.json({ error: "Invalid email address." }, { status: 400 });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;

    if (!gmailUser || !gmailPass) {
      console.error("Gmail env vars GMAIL_USER or GMAIL_PASS not configured.");
      return Response.json({ error: "Mail server configuration missing." }, { status: 500 });
    }

    const otp = randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 600_000; // 10 minutes

    // Persist OTP in Redis (primary) with PostgreSQL fallback — survives server restart
    await setOtp(email, { otp, name: name || undefined, expiresAt });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"NAAMI Atelier" <${gmailUser}>`,
      to: email,
      subject: "Your NAAMI Sign-In Code",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="background:#F4F0E6;margin:0;padding:40px 0;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-top:3px solid #8B1A1A;">
        <tr><td style="padding:36px 40px 20px;">
          <p style="font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#8B1A1A;margin:0 0 12px;">NAAMI ATELIER</p>
          <h1 style="font-family:Georgia,serif;font-weight:300;font-size:26px;color:#111;margin:0 0 8px;">
            Your sign-in code
          </h1>
          <p style="font-size:13px;color:#555;margin:0 0 28px;line-height:1.6;">
            ${name ? `Hello ${name},<br/>` : ""}Use the code below to sign in. It expires in 10 minutes.
          </p>
          <div style="background:#F4F0E6;border-left:3px solid #8B1A1A;padding:20px 28px;margin-bottom:28px;">
            <span style="font-family:Georgia,serif;font-size:36px;letter-spacing:0.2em;color:#111;">${otp}</span>
          </div>
          <p style="font-size:11px;color:#aaa;margin:0;">
            If you did not request this code, you can safely ignore this email.
          </p>
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
</html>`,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[send-otp]", err);
    return Response.json({ error: "Failed to send code. Please try again." }, { status: 500 });
  }
}
