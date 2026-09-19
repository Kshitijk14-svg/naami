import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getUserByEmail } from "@/db/queries/users";
import { getIntentByRazorpayOrderId, cancelIntent } from "@/db/queries/checkoutIntents";
import { checkRateLimit } from "@/lib/redis";
import { createLogger } from "@/lib/logger";

const log = createLogger("cancel-order");

// Fired when a shopper dismisses the Razorpay popup without paying, so the
// stock/coupon hold their create-order call took is freed immediately instead
// of sitting until the reservation TTL lapses. Best-effort from the client —
// the TTL (see reservations.ts) remains the backstop if this never arrives.
export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["customer", "staff", "admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  try {
    const rate = await checkRateLimit(`cancel-order:${auth.email}`, {
      requests: 20,
      window: "5 m",
    });
    if (rate?.limited) {
      return Response.json({ error: "Too many attempts." }, { status: 429 });
    }

    const user = await getUserByEmail(auth.email);
    if (!user) return Response.json({ error: "User not found." }, { status: 401 });

    const body = await request.json().catch(() => null);
    const razorpayOrderId: string = typeof body?.razorpayOrderId === "string" ? body.razorpayOrderId : "";
    if (!razorpayOrderId) {
      return Response.json({ success: false });
    }

    const intent = await getIntentByRazorpayOrderId(razorpayOrderId);
    // Unknown order, or someone else's — respond the same as a successful
    // no-op rather than revealing whether the order id exists.
    if (!intent || intent.userId !== user.id) {
      return Response.json({ success: false });
    }

    const cancelled = await cancelIntent(intent.id);
    return Response.json({ success: cancelled });
  } catch (err) {
    log.error("unexpected failure", { err });
    return Response.json({ success: false });
  }
}
