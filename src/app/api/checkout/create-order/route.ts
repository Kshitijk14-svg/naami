import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { db } from "@/lib/db";
import { abandonedCarts } from "@/db/schema";
import { getUserByEmail } from "@/db/queries/users";
import { priceCart, CheckoutPricingError, type CartItemInput } from "@/lib/checkoutPricing";
import {
  prepareIntent,
  attachRazorpayOrder,
  CouponHoldError,
} from "@/db/queries/checkoutIntents";
import { InsufficientStockError } from "@/db/queries/reservations";
import { createRazorpayOrder, isRazorpayConfigured } from "@/lib/razorpay";
import { clientIp } from "@/lib/requestIp";
import { checkRateLimit } from "@/lib/redis";
import { createLogger } from "@/lib/logger";

const log = createLogger("create-order");

export async function POST(request: NextRequest) {
  // Any authenticated user can checkout
  const auth = await verifyAdminRequest(request, ["customer", "staff", "admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  try {
    if (!isRazorpayConfigured()) {
      return Response.json({ error: "Payment gateway not configured." }, { status: 503 });
    }

    // Each call opens a real gateway order and holds real inventory, so it
    // cannot be free to spam.
    const rate = await checkRateLimit(`checkout:${auth.email}`, {
      requests: 12,
      window: "5 m",
    });
    if (rate?.limited) {
      return Response.json(
        { error: "Too many checkout attempts. Please wait a moment." },
        { status: 429 }
      );
    }

    const user = await getUserByEmail(auth.email);
    if (!user) return Response.json({ error: "User not found." }, { status: 401 });

    const body = await request.json();
    const items: CartItemInput[] = Array.isArray(body.items) ? body.items : [];
    const couponCode: string = (body.couponCode ?? "").toUpperCase().trim();

    // The receipt email is the session's, not the body's. It used to be
    // client-supplied and written straight into abandoned_carts, which let one
    // account queue "abandoned cart" mail to any address from our domain.
    const shippingEmail = auth.email;

    // Price the cart from DB rows — client-sent prices are never trusted.
    let subtotalInr: number;
    let pricedItems;
    try {
      ({ subtotalInr, pricedItems } = await priceCart(items));
    } catch (err) {
      if (err instanceof CheckoutPricingError) {
        return Response.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    // Hold stock and the coupon, and record what this checkout is allowed to
    // buy — all before the customer can pay. Losing a race here costs nothing.
    let prepared;
    try {
      prepared = await prepareIntent({
        userId: user.id,
        pricedItems,
        subtotalInr,
        couponCode: couponCode || undefined,
        ip: clientIp(request),
        shipping: {
          name: body.shippingName || undefined,
          email: shippingEmail,
          phone: body.shippingPhone || undefined,
          address: body.shippingAddress ? JSON.stringify(body.shippingAddress) : undefined,
        },
      });
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        return Response.json({ error: err.message }, { status: 409 });
      }
      if (err instanceof CouponHoldError) {
        return Response.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    // Open the gateway order for exactly the amount the intent records.
    let rzpOrder;
    try {
      rzpOrder = await createRazorpayOrder({
        amountInr: prepared.payableInr,
        receipt: `rcpt_${prepared.intentId}`,
        notes: { intentId: String(prepared.intentId), userId: String(user.id) },
      });
    } catch (err) {
      // The intent keeps its holds until the expiry sweep reclaims them, so a
      // gateway blip cannot leave stock permanently stuck.
      log.error("Razorpay order creation failed", { intentId: prepared.intentId, err });
      return Response.json({ error: "Failed to create payment order." }, { status: 502 });
    }

    await attachRazorpayOrder(prepared.intentId, rzpOrder.id);

    // Abandoned-cart snapshot, keyed to the signed-in user's own address.
    await db
      .insert(abandonedCarts)
      .values({
        email: shippingEmail.toLowerCase(),
        items: JSON.stringify(
          pricedItems.map((i) => ({
            productName: i.name,
            unitPriceInr: i.unitPriceInr,
            quantity: i.quantity,
            size: i.size,
          }))
        ),
      })
      .onConflictDoUpdate({
        target: abandonedCarts.email,
        set: {
          items: JSON.stringify(
            pricedItems.map((i) => ({
              productName: i.name,
              unitPriceInr: i.unitPriceInr,
              quantity: i.quantity,
              size: i.size,
            }))
          ),
          updatedAt: new Date(),
        },
      });

    return Response.json({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      subtotalInr: prepared.subtotalInr,
      discountInr: prepared.discountInr,
      payableInr: prepared.payableInr,
      expiresAt: prepared.expiresAt.toISOString(),
    });
  } catch (err) {
    log.error("unexpected failure", { err });
    return Response.json({ error: "An error occurred. Please try again." }, { status: 500 });
  }
}
