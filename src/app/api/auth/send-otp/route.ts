import nodemailer from 'nodemailer';
import { randomInt } from 'node:crypto';
import otpStore from '@/lib/otpStore';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email: string = (body.email ?? '').toLowerCase().trim();
    const name: string = (body.name ?? '').trim();

    if (!EMAIL_REGEX.test(email)) {
      return Response.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    // Gmail SMTP transporter credentials check
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;

    if (!gmailUser || !gmailPass) {
      console.error('Gmail environment variables GMAIL_USER or GMAIL_PASS are not configured.');
      return Response.json({ error: 'Mail server configuration missing.' }, { status: 500 });
    }

    const otp = randomInt(100000, 999999).toString();
    otpStore.set(email, { otp, expiresAt: Date.now() + 600_000, attempts: 0, name });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.sendMail({
      from: `"NAAMI Atelier" <${gmailUser}>`,
      to: email,
      subject: 'Your NAAMI Sign-In Code',
      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:0;background:#F4F0E6;font-family:Georgia,serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F0E6;padding:48px 0;">
              <tr><td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#EDE8DC;border:1px solid rgba(139,26,26,0.12);">
                  <tr><td style="padding:40px 48px 0;">
                    <p style="margin:0 0 4px;font-size:9px;font-family:Arial,sans-serif;letter-spacing:0.3em;text-transform:uppercase;color:#8B1A1A;font-weight:700;">
                      NAAMI // ATELIER ACCESS
                    </p>
                    <h1 style="margin:8px 0 0;font-size:28px;font-weight:300;letter-spacing:0.05em;color:#111111;text-transform:uppercase;">
                      Enter the Atelier
                    </h1>
                  </td></tr>
                  <tr><td style="padding:32px 48px;">
                    <p style="margin:0 0 24px;font-size:12px;font-family:Arial,sans-serif;color:rgba(17,17,17,0.6);line-height:1.6;">
                      ${name ? `Hello ${name}, here is your ` : 'Your '}one-time sign-in code. Valid for 10 minutes.
                    </p>
                    <div style="background:#F4F0E6;border-left:3px solid #8B1A1A;padding:20px 28px;margin-bottom:24px;">
                      <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:0.18em;color:#111111;font-family:Courier,monospace;">
                        ${otp}
                      </p>
                    </div>
                    <p style="margin:0;font-size:11px;font-family:Arial,sans-serif;color:rgba(17,17,17,0.4);line-height:1.6;">
                      If you did not request this code, you can safely ignore this email.
                    </p>
                  </td></tr>
                  <tr><td style="padding:24px 48px;border-top:1px solid rgba(139,26,26,0.08);">
                    <p style="margin:0;font-size:9px;font-family:Arial,sans-serif;letter-spacing:0.2em;text-transform:uppercase;color:rgba(17,17,17,0.3);">
                      © 2026 NAAMI — Bespoke Handcrafted Shirts
                    </p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </body>
        </html>
      `,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('[send-otp]', err);
    return Response.json({ error: 'Failed to send code. Please try again.' }, { status: 500 });
  }
}
