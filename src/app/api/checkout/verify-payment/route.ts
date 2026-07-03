import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getUserByEmail } from "@/db/queries/users";
import { createOrder, getOrderByRazorpayPaymentId } from "@/db/queries/orders";
import { db } from "@/lib/db";
import { abandonedCarts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { withIdempotency } from "@/lib/idempotency";
import { priceCart, CheckoutPricingError } from "@/lib/checkoutPricing";
import { clientIp } from "@/lib/requestIp";
import { createLogger } from "@/lib/logger";
import type { CartItem } from "@/models/cartStore";

const log = createLogger("verify-payment");
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Constant-time signature comparison (avoids leaking match progress via timing).
function signaturesMatch(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual ?? "");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["customer", "staff", "admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  try {
    if (!RAZORPAY_KEY_SECRET) {
      return Response.json({ error: "Payment gateway not configured." }, { status: 503 });
    }

    const body = await request.json();
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      items,
      shippingName,
      shippingEmail,
      shippingPhone,
      shippingAddress,
      couponCode,
    }: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      items: CartItem[];
      shippingName?: string;
      shippingEmail?: string;
      shippingPhone?: string;
      shippingAddress?: { line1: string; line2?: string; city: string; state: string; pincode: string };
      couponCode?: string;
    } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Invalid payment payload." }, { status: 400 });
    }

    // 1. Verify HMAC-SHA256 signature (constant-time).
    const expectedSig = createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (!signaturesMatch(expectedSig, razorpaySignature)) {
      log.warn("signature verification failed", { razorpayOrderId, razorpayPaymentId });
      return Response.json({ error: "Payment signature verification failed." }, { status: 400 });
    }

    // 2. Idempotent order creation, keyed by the gateway payment id. A retry
    //    (double-click, network retry) replays the stored response instead of
    //    creating a second order. The unique index on orders.razorpay_payment_id
    //    is the hard backstop against a concurrent duplicate.
    const result = await withIdempotency(`pay:${razorpayPaymentId}`, async () => {
      // Fast path: order already exists for this payment.
      const existing = await getOrderByRazorpayPaymentId(razorpayPaymentId);
      if (existing) {
        log.info("duplicate payment ignored", { orderId: existing.id, razorpayPaymentId });
        return { statusCode: 200, body: { orderId: existing.id, idempotent: true } };
      }

      const user = await getUserByEmail(auth.email);
      if (!user) {
        return { statusCode: 401, body: { error: "User not found." } };
      }

      // Re-price the cart from DB rows — client-sent prices are never trusted
      // for the stored order or its item snapshots.
      let subtotalInr: number;
      let pricedItems;
      try {
        ({ subtotalInr, pricedItems } = await priceCart(
          items.map((i) => ({ productId: i.productId, quantity: i.quantity, size: i.size }))
        ));
      } catch (err) {
        if (err instanceof CheckoutPricingError) {
          return { statusCode: 400, body: { error: err.message } };
        }
        throw err;
      }

      const orderItemsInput = pricedItems.map((i) => ({
        productId: i.productId,
        name: i.name,
        unitPriceInr: i.unitPriceInr,
        quantity: i.quantity,
        size: i.size,
      }));

      // createOrder is atomic and enqueues confirmation + low-stock emails via the
      // transactional outbox (drained by the jobs worker) — no fire-and-forget here.
      // It derives the discount and final total itself under the coupon lock.
      const order = await createOrder({
        userId: user.id,
        items: orderItemsInput,
        subtotalInr,
        couponCode: couponCode || undefined,
        ip: clientIp(request),
        shippingName: shippingName || undefined,
        shippingEmail: shippingEmail || undefined,
        shippingPhone: shippingPhone || undefined,
        shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : undefined,
        razorpayOrderId,
        razorpayPaymentId,
      });

      if (shippingEmail) {
        await db
          .delete(abandonedCarts)
          .where(eq(abandonedCarts.email, shippingEmail.toLowerCase()));
      }

      log.info("order created", { orderId: order.id, userId: user.id });
      return { statusCode: 200, body: { orderId: order.id } };
    });

    return Response.json(result.body, { status: result.statusCode });
  } catch (err) {
    log.error("order creation failed", { err });
    return Response.json({ error: "Order creation failed. Please contact support." }, { status: 500 });
  }
}
