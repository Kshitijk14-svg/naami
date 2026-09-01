import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getUserByEmail } from "@/db/queries/users";
import { fulfilOrder } from "@/lib/fulfilOrder";
import { verifyCheckoutSignature, isRazorpayConfigured } from "@/lib/razorpay";
import { checkRateLimit } from "@/lib/redis";
import { createLogger } from "@/lib/logger";

const log = createLogger("verify-payment");

// Browser callback after the Razorpay widget reports success.
//
// It accepts nothing but the three gateway identifiers. Items, prices, coupon
// and shipping all come from the checkout intent recorded before payment — so
// replaying a valid signature with a different cart buys nothing, because the
// cart in the request is never read.
//
// The webhook (src/app/api/webhooks/razorpay/route.ts) runs the same
// fulfilOrder() path, so an order still lands if this request never arrives.

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["customer", "staff", "admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  try {
    if (!isRazorpayConfigured()) {
      return Response.json({ error: "Payment gateway not configured." }, { status: 503 });
    }

    const rate = await checkRateLimit(`verify-payment:${auth.email}`, {
      requests: 20,
      window: "5 m",
    });
    if (rate?.limited) {
      return Response.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
    }

    const body = await request.json();
    const razorpayOrderId: string = body.razorpayOrderId ?? "";
    const razorpayPaymentId: string = body.razorpayPaymentId ?? "";
    const razorpaySignature: string = body.razorpaySignature ?? "";

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return Response.json({ error: "Invalid payment payload." }, { status: 400 });
    }

    // Cheap gate first: proves the ids came from our merchant account before we
    // spend a database round-trip or a gateway call on them.
    if (!verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      log.warn("signature verification failed", { razorpayOrderId, razorpayPaymentId });
      return Response.json({ error: "Payment signature verification failed." }, { status: 400 });
    }

    const user = await getUserByEmail(auth.email);
    if (!user) return Response.json({ error: "User not found." }, { status: 401 });

    const result = await fulfilOrder({
      razorpayOrderId,
      razorpayPaymentId,
      source: "verify-payment",
      requireUserId: user.id,
    });

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ orderId: result.orderId, idempotent: result.alreadyExisted });
  } catch (err) {
    log.error("verification failed", { err });
    return Response.json(
      { error: "Order creation failed. Please contact support." },
      { status: 500 }
    );
  }
}
