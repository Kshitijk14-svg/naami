import { createOrder, getOrderByRazorpayPaymentId } from "@/db/queries/orders";
import { InsufficientStockError } from "@/db/queries/reservations";
import {
  claimIntent,
  unclaimIntent,
  getIntentByRazorpayOrderId,
  markIntentFulfilled,
  markIntentFailed,
  recordPaymentIncident,
  intentItems,
  intentShipping,
  type CheckoutIntentRow,
} from "@/db/queries/checkoutIntents";
import { assertPaymentMatches, PaymentMismatchError } from "@/lib/razorpay";
import { db } from "@/lib/db";
import { abandonedCarts, coupons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

// The one path from "Razorpay says this was paid" to "an order exists".
//
// Both entry points use it — the browser callback and the webhook — so the two
// can never drift apart on what counts as a valid payment. Whichever arrives
// first wins the intent; the other gets the same order id back.

const log = createLogger("fulfil-order");

export type FulfilResult =
  | { ok: true; orderId: string; alreadyExisted: boolean }
  | { ok: false; status: number; error: string };

export interface FulfilInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  source: "verify-payment" | "webhook";
  /** When set, the intent must belong to this user. Omitted for webhooks. */
  requireUserId?: number;
}

/**
 * Turn a confirmed gateway payment into an order.
 *
 * Everything that decides the order — items, prices, discount, shipping — comes
 * from the stored intent. Nothing is read from the caller's request body, which
 * is what makes it impossible to pay for one cart and receive another.
 */
export async function fulfilOrder(input: FulfilInput): Promise<FulfilResult> {
  const { razorpayOrderId, razorpayPaymentId, source } = input;

  // Fast path: this payment already produced an order.
  const existing = await getOrderByRazorpayPaymentId(razorpayPaymentId);
  if (existing) {
    log.info("payment already fulfilled", { orderId: existing.id, razorpayPaymentId });
    return { ok: true, orderId: existing.id, alreadyExisted: true };
  }

  // Claim the intent. Only one caller can flip created -> consumed, so a
  // double-clicked callback racing the webhook still yields one order.
  const intent = await claimIntent(razorpayOrderId);

  if (!intent) {
    const known = await getIntentByRazorpayOrderId(razorpayOrderId);
    if (!known) {
      // A signature valid for our account but for an order we never issued.
      log.warn("payment for unknown intent", { razorpayOrderId, razorpayPaymentId, source });
      await recordPaymentIncident({
        razorpayOrderId,
        razorpayPaymentId,
        reason: "Payment received for a checkout intent this server never created.",
        source,
      });
      return { ok: false, status: 404, error: "Unknown checkout session." };
    }
    if (known.status === "consumed" && known.orderId) {
      return { ok: true, orderId: known.orderId, alreadyExisted: true };
    }
    if (known.status === "consumed") {
      // Another request is mid-flight; it will finish or hand the intent back.
      return { ok: false, status: 409, error: "This payment is already being processed." };
    }
    // Expired or failed: the holds are gone, so we cannot safely ship.
    await recordPaymentIncident({
      razorpayOrderId,
      razorpayPaymentId,
      intentId: known.id,
      userId: known.userId,
      amountInr: known.payableInr,
      reason: `Payment arrived for a ${known.status} checkout session.`,
      source,
    });
    return {
      ok: false,
      status: 409,
      error:
        "This checkout session expired before payment completed. Your payment was received — our team will contact you to resolve it.",
    };
  }

  // Ownership: a customer may only fulfil their own intent.
  if (input.requireUserId !== undefined && intent.userId !== input.requireUserId) {
    await unclaimIntent(intent.id);
    log.warn("intent ownership mismatch", {
      intentId: intent.id,
      expected: input.requireUserId,
      actual: intent.userId,
    });
    return { ok: false, status: 404, error: "Unknown checkout session." };
  }

  return fulfilClaimedIntent(intent, razorpayPaymentId, source);
}

async function fulfilClaimedIntent(
  intent: CheckoutIntentRow,
  razorpayPaymentId: string,
  source: "verify-payment" | "webhook"
): Promise<FulfilResult> {
  // Ask Razorpay what actually happened. The signature proves the gateway
  // signed this (order, payment) pair; only this call proves the money moved,
  // and moved for the amount this intent was opened for.
  let paidAmountInr: number;
  try {
    const payment = await assertPaymentMatches({
      paymentId: razorpayPaymentId,
      razorpayOrderId: intent.razorpayOrderId,
      expectedInr: intent.payableInr,
    });
    paidAmountInr = payment.amount / 100;
  } catch (err) {
    if (err instanceof PaymentMismatchError) {
      // The payment does not pay for this intent. Do not create an order, and
      // do not release the intent for retry — this needs a human.
      await markIntentFailed(intent.id, err.message);
      await recordPaymentIncident({
        razorpayOrderId: intent.razorpayOrderId,
        razorpayPaymentId,
        intentId: intent.id,
        userId: intent.userId,
        amountInr: intent.payableInr,
        reason: `Payment/intent mismatch: ${err.message}`,
        source,
      });
      log.error("payment did not match intent", { intentId: intent.id, err: err.message });
      return { ok: false, status: 400, error: "Payment could not be verified." };
    }
    // Gateway unreachable — hand the intent back so a retry or the webhook can
    // pick it up. Failing closed here is the point: never assume payment.
    await unclaimIntent(intent.id);
    log.error("could not reach gateway to confirm payment", { intentId: intent.id, err });
    return {
      ok: false,
      status: 503,
      error: "Could not confirm your payment with the gateway. Please retry in a moment.",
    };
  }

  const items = intentItems(intent);
  if (items.length === 0) {
    await markIntentFailed(intent.id, "Intent snapshot had no items.");
    await recordPaymentIncident({
      razorpayOrderId: intent.razorpayOrderId,
      razorpayPaymentId,
      intentId: intent.id,
      userId: intent.userId,
      amountInr: paidAmountInr,
      reason: "Intent snapshot had no items.",
      source,
    });
    return { ok: false, status: 500, error: "Order could not be created." };
  }

  const shipping = intentShipping(intent);

  try {
    const order = await createOrder({
      userId: intent.userId,
      items: items.map((i) => ({
        productId: i.productId,
        name: i.name,
        unitPriceInr: i.unitPriceInr,
        quantity: i.quantity,
        size: i.size,
      })),
      subtotalInr: intent.subtotalInr,
      discountInr: intent.discountInr,
      couponId: await resolveHeldCouponId(intent),
      intentId: intent.id,
      shippingName: shipping.name,
      shippingEmail: shipping.email,
      shippingPhone: shipping.phone,
      shippingAddress: shipping.address,
      razorpayOrderId: intent.razorpayOrderId,
      razorpayPaymentId,
      paidAmountInr,
      paymentStatus: "paid",
    });

    await markIntentFulfilled(intent.id, order.id);

    if (shipping.email) {
      await db
        .delete(abandonedCarts)
        .where(eq(abandonedCarts.email, shipping.email.toLowerCase()));
    }

    log.info("order fulfilled", {
      orderId: order.id,
      intentId: intent.id,
      paidAmountInr,
      source,
    });
    return { ok: true, orderId: order.id, alreadyExisted: false };
  } catch (err) {
    // Money is captured and we could not write the order. Record it so it is
    // recoverable, and surface a message that says so plainly.
    const reason = err instanceof Error ? err.message : String(err);
    const stockRelated = err instanceof InsufficientStockError;

    await markIntentFailed(intent.id, reason);
    await recordPaymentIncident({
      razorpayOrderId: intent.razorpayOrderId,
      razorpayPaymentId,
      intentId: intent.id,
      userId: intent.userId,
      amountInr: paidAmountInr,
      reason: stockRelated ? `Stock guard rejected a paid order: ${reason}` : reason,
      source,
    });
    log.error("order creation failed after capture", { intentId: intent.id, err });

    return {
      ok: false,
      status: 409,
      error:
        "Your payment was received but the order could not be completed. Our team has been notified and will contact you.",
    };
  }
}

/** The coupon this intent is holding a use of, if any. */
async function resolveHeldCouponId(intent: CheckoutIntentRow): Promise<number | null> {
  if (!intent.couponCode) return null;
  const [row] = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(eq(coupons.code, intent.couponCode.toUpperCase()))
    .limit(1);
  return row?.id ?? null;
}
