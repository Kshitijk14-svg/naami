import { createLogger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/redis";
import { clientIp } from "@/lib/requestIp";
import { sendContactFormNotification } from "@/lib/email";

const log = createLogger("contact");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 2000;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const name: string = typeof body?.name === "string" ? body.name.trim() : "";
    const email: string = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const message: string = typeof body?.message === "string" ? body.message.trim() : "";

    if (!name || name.length > MAX_NAME_LENGTH) {
      return Response.json({ error: "Please enter your name." }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(email)) {
      return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      return Response.json(
        { error: `Please enter a message (up to ${MAX_MESSAGE_LENGTH} characters).` },
        { status: 400 }
      );
    }

    // Fail-open rate limit per IP — same pattern as send-otp.
    const rl = await checkRateLimit(`contact:${clientIp(request) ?? "anon"}`, {
      requests: 5,
      window: "10 m",
    });
    if (rl?.limited) {
      return Response.json(
        { error: "Too many messages sent. Please try again later." },
        { status: 429 }
      );
    }

    await sendContactFormNotification({ name, email, message });

    return Response.json({ success: true });
  } catch (err) {
    log.error("unexpected failure", { err });
    return Response.json({ error: "Failed to send your message. Please try again." }, { status: 500 });
  }
}
