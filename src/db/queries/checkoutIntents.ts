import { db } from "@/lib/db";
import { checkoutIntents, coupons, couponRedemptions, paymentIncidents } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
import { computeDiscount, validateCouponWindow, checkRedemptionLimits } from "@/lib/coupons";
import {
  reserveStock,
  RESERVATION_TTL_MINUTES,
  type ReservableItem,
} from "@/db/queries/reservations";
import { encryptField, isEncrypted, decryptField, isEncryptionConfigured } from "@/lib/crypto";
import type { PricedItem } from "@/lib/checkoutPricing";

// A checkout intent is the server's answer to "what is this Razorpay order
// allowed to buy, and for how much?".
//
// It is written before the customer is handed to the payment widget, and it is
// the ONLY thing verification reads. That removes the client from the loop
// entirely: a valid signature paired with a different cart no longer buys
// anything, because the cart is not taken from the request at all.

const log = createLogger("checkout-intents");

export type CheckoutIntentRow = typeof checkoutIntents.$inferSelect;

/** Thrown when a coupon cannot be held for this checkout. */
export class CouponHoldError extends Error {}

function encryptPII(value?: string | null): string | null {
  if (!value) return null;
  return isEncryptionConfigured() ? encryptField(value) : value;
}
function decryptPII(value: string | null): string | null {
  return isEncrypted(value) ? decryptField(value) : value;
}

export interface IntentShipping {
  name?: string;
  email?: string;
  phone?: string;
  address?: string; // JSON string
}

export interface PrepareIntentInput {
  userId: number;
  pricedItems: PricedItem[];
  subtotalInr: number;
  couponCode?: string;
  ip?: string | null;
  shipping: IntentShipping;
}

export interface PreparedIntent {
  intentId: number;
  subtotalInr: number;
  discountInr: number;
  payableInr: number;
  couponId: number | null;
  expiresAt: Date;
}

/**
 * Hold everything this checkout needs, then record the intent — all in one
 * transaction, before any money moves.
 *
 * The order matters: stock and the coupon are claimed here so that two people
 * racing for the last unit (or a coupon's last use) collide now, when losing
 * costs nothing, instead of after both have been charged.
 *
 * `razorpayOrderId` is not known yet — the gateway order is opened after this
 * commits, and `attachRazorpayOrder` fills it in. A placeholder keeps the NOT
 * NULL + UNIQUE constraint honest in the meantime.
 */
export async function prepareIntent(input: PrepareIntentInput): Promise<PreparedIntent> {
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60_000);

  return db.transaction(async (tx) => {
    let couponId: number | null = null;
    let discountInr = 0;

    if (input.couponCode) {
      // FOR UPDATE serialises every redemption of this coupon, so the count we
      // read is the count we increment.
      const [coupon] = await tx
        .select()
        .from(coupons)
        .where(
          and(eq(coupons.code, input.couponCode.toUpperCase()), sql`${coupons.deletedAt} IS NULL`)
        )
        .for("update")
        .limit(1);

      if (!coupon) throw new CouponHoldError("Invalid or inactive coupon.");

      const windowError = validateCouponWindow(coupon, input.subtotalInr);
      if (windowError) throw new CouponHoldError(windowError);

      const limitError = await checkRedemptionLimits(
        tx,
        coupon,
        input.userId,
        input.ip ?? null
      );
      if (limitError) throw new CouponHoldError(limitError);

      couponId = coupon.id;
      discountInr = computeDiscount(coupon, input.subtotalInr);

      await tx
        .update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(eq(coupons.id, coupon.id));
    }

    const payableInr = Math.max(0, input.subtotalInr - discountInr);

    const [intent] = await tx
      .insert(checkoutIntents)
      .values({
        // Placeholder until the gateway order exists; unique per intent.
        razorpayOrderId: `pending_${crypto.randomUUID()}`,
        userId: input.userId,
        items: JSON.stringify(input.pricedItems),
        subtotalInr: input.subtotalInr,
        discountInr,
        payableInr,
        couponCode: input.couponCode ?? null,
        shippingName: input.shipping.name ?? null,
        shippingEmail: input.shipping.email ?? null,
        shippingPhone: encryptPII(input.shipping.phone),
        shippingAddress: encryptPII(input.shipping.address),
        expiresAt,
      })
      .returning({ id: checkoutIntents.id });

    // The coupon hold is recorded against the intent, with no order yet. If the
    // customer never pays, the expiry sweep deletes this row and gives the use
    // back; if they do, createOrder links it to the order.
    if (couponId !== null) {
      await tx.insert(couponRedemptions).values({
        couponId,
        intentId: intent.id,
        userId: input.userId,
        ip: input.ip ?? null,
        discountInr,
      });
    }

    // Throws InsufficientStockError, rolling back the coupon hold too.
    const reservable: ReservableItem[] = input.pricedItems.map((i) => ({
      productId: i.productId,
      name: i.name,
      quantity: i.quantity,
      size: i.size,
    }));
    await reserveStock(tx, intent.id, reservable);

    return {
      intentId: intent.id,
      subtotalInr: input.subtotalInr,
      discountInr,
      payableInr,
      couponId,
      expiresAt,
    };
  });
}

/** Bind a freshly created gateway order to its intent. */
export async function attachRazorpayOrder(
  intentId: number,
  razorpayOrderId: string
): Promise<void> {
  await db
    .update(checkoutIntents)
    .set({ razorpayOrderId, updatedAt: new Date() })
    .where(eq(checkoutIntents.id, intentId));
}

/**
 * Claim an intent for fulfilment.
 *
 * The conditional UPDATE is the replay gate for the entire payment flow: only
 * the first caller to flip `created` -> `consumed` gets a row back, so a
 * double-clicked browser callback racing the webhook produces exactly one
 * order without needing a separate lock.
 *
 * Returns null when the intent does not exist, is already spent, or has lapsed.
 */
export async function claimIntent(
  razorpayOrderId: string
): Promise<CheckoutIntentRow | null> {
  const [claimed] = await db
    .update(checkoutIntents)
    .set({ status: "consumed", updatedAt: new Date() })
    .where(
      and(
        eq(checkoutIntents.razorpayOrderId, razorpayOrderId),
        eq(checkoutIntents.status, "created")
      )
    )
    .returning();
  return claimed ?? null;
}

/** Hand a claimed intent back when fulfilment failed, so it can be retried. */
export async function unclaimIntent(intentId: number): Promise<void> {
  await db
    .update(checkoutIntents)
    .set({ status: "created", updatedAt: new Date() })
    .where(and(eq(checkoutIntents.id, intentId), eq(checkoutIntents.status, "consumed")));
}

export async function getIntentByRazorpayOrderId(
  razorpayOrderId: string
): Promise<CheckoutIntentRow | null> {
  const [row] = await db
    .select()
    .from(checkoutIntents)
    .where(eq(checkoutIntents.razorpayOrderId, razorpayOrderId))
    .limit(1);
  return row ?? null;
}

export async function markIntentFulfilled(
  intentId: number,
  orderId: string
): Promise<void> {
  await db
    .update(checkoutIntents)
    .set({ orderId, updatedAt: new Date() })
    .where(eq(checkoutIntents.id, intentId));
}

export async function markIntentFailed(
  intentId: number,
  reason: string
): Promise<void> {
  await db
    .update(checkoutIntents)
    .set({ status: "failed", failureReason: reason, updatedAt: new Date() })
    .where(eq(checkoutIntents.id, intentId));
}

/** The item snapshot frozen when the intent was created. */
export function intentItems(intent: CheckoutIntentRow): PricedItem[] {
  try {
    const parsed = JSON.parse(intent.items);
    return Array.isArray(parsed) ? (parsed as PricedItem[]) : [];
  } catch {
    log.error("intent has unparseable items", { intentId: intent.id });
    return [];
  }
}

/** Shipping details as captured at intent time, decrypted for use. */
export function intentShipping(intent: CheckoutIntentRow): IntentShipping {
  return {
    name: intent.shippingName ?? undefined,
    email: intent.shippingEmail ?? undefined,
    phone: decryptPII(intent.shippingPhone) ?? undefined,
    address: decryptPII(intent.shippingAddress) ?? undefined,
  };
}

/**
 * Record a payment the gateway captured that we could not turn into an order.
 *
 * Deliberately best-effort and outside any transaction — it runs on the failure
 * path, so it must never itself throw and mask the original problem. A payment
 * that lands here is visible to admin instead of vanishing into a 500.
 */
export async function recordPaymentIncident(input: {
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  intentId?: number | null;
  userId?: number | null;
  amountInr?: number | null;
  reason: string;
  source: "verify-payment" | "webhook";
}): Promise<void> {
  try {
    await db.insert(paymentIncidents).values({
      razorpayPaymentId: input.razorpayPaymentId ?? null,
      razorpayOrderId: input.razorpayOrderId ?? null,
      intentId: input.intentId ?? null,
      userId: input.userId ?? null,
      amountInr: input.amountInr ?? null,
      reason: input.reason,
      source: input.source,
    });
    log.error("payment incident recorded", {
      razorpayPaymentId: input.razorpayPaymentId,
      reason: input.reason,
      source: input.source,
    });
  } catch (err) {
    log.error("FAILED to record payment incident", { err, original: input.reason });
  }
}
