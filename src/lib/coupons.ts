import { db } from "@/lib/db";
import { couponRedemptions, coupons } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

// A Drizzle executor: either the primary db or a transaction handle, so the
// redemption-limit check can run inside createOrder's transaction.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export type CouponRow = typeof coupons.$inferSelect;

type DiscountFields = Pick<CouponRow, "discountType" | "discountValue" | "maxDiscountInr">;

/**
 * Single source of truth for coupon discount math (₹, integer).
 * Percent discounts are floored and capped by maxDiscountInr when set;
 * fixed discounts never exceed the subtotal.
 */
export function computeDiscount(coupon: DiscountFields, subtotalInr: number): number {
  if (subtotalInr <= 0) return 0;
  if (coupon.discountType === "percent") {
    const raw = Math.floor((subtotalInr * coupon.discountValue) / 100);
    return coupon.maxDiscountInr !== null ? Math.min(raw, coupon.maxDiscountInr) : raw;
  }
  return Math.min(coupon.discountValue, subtotalInr);
}

/**
 * Stateless validity checks (active, window, aggregate limit, min order).
 * Returns a user-facing error message, or null when the coupon is usable.
 * All time comparisons are UTC — IST is a display concern only.
 */
export function validateCouponWindow(
  coupon: CouponRow,
  subtotalInr: number,
  now: Date = new Date()
): string | null {
  if (coupon.deletedAt || !coupon.isActive) return "Invalid or inactive coupon.";
  if (coupon.startsAt && coupon.startsAt > now) return "This coupon is not active yet.";
  if (coupon.expiresAt && coupon.expiresAt < now) return "This coupon has expired.";
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)
    return "This coupon has reached its usage limit.";
  if (coupon.minOrderValue !== null && subtotalInr < coupon.minOrderValue)
    return `Minimum order value of ₹${coupon.minOrderValue.toLocaleString("en-IN")} required.`;
  return null;
}

/**
 * Validate admin-supplied coupon fields. `partial` allows omitted fields
 * (PUT). Returns an error message or null.
 */
export function validateCouponInput(
  body: Record<string, unknown>,
  partial = false
): string | null {
  if (!partial || body.code !== undefined) {
    if (typeof body.code !== "string" || !body.code.trim()) return "Coupon code is required.";
  }
  if (!partial || body.discountType !== undefined) {
    if (body.discountType !== "percent" && body.discountType !== "fixed")
      return "discountType must be 'percent' or 'fixed'.";
  }
  if (!partial || body.discountValue !== undefined) {
    const v = body.discountValue;
    if (typeof v !== "number" || !Number.isInteger(v) || v <= 0)
      return "discountValue must be a positive integer.";
    if (body.discountType === "percent" && v > 100)
      return "Percent discount cannot exceed 100.";
  }
  if (body.maxDiscountInr != null && body.discountType === "fixed")
    return "Max discount cap only applies to percent coupons.";

  for (const field of ["minOrderValue", "maxDiscountInr", "usageLimit", "perUserLimit", "perIpLimit"]) {
    const v = body[field];
    if (v != null && (typeof v !== "number" || !Number.isInteger(v) || v < 0))
      return `${field} must be a non-negative integer.`;
  }

  for (const field of ["startsAt", "expiresAt"]) {
    const v = body[field];
    if (v != null && (typeof v !== "string" || isNaN(new Date(v).getTime())))
      return `${field} must be a valid ISO datetime.`;
  }
  if (
    typeof body.startsAt === "string" &&
    typeof body.expiresAt === "string" &&
    new Date(body.startsAt) >= new Date(body.expiresAt)
  ) {
    return "Start date must be before expiry date.";
  }

  return null;
}

/**
 * Per-user / per-IP redemption limits, counted from coupon_redemptions.
 * Pass the surrounding transaction to make the check race-safe alongside the
 * FOR UPDATE coupon lock in createOrder. Returns error message or null.
 */
export async function checkRedemptionLimits(
  exec: Executor,
  coupon: Pick<CouponRow, "id" | "perUserLimit" | "perIpLimit">,
  userId: number,
  ip: string | null
): Promise<string | null> {
  if (coupon.perUserLimit !== null) {
    const [row] = await exec
      .select({ n: sql<number>`count(*)::int` })
      .from(couponRedemptions)
      .where(
        and(
          eq(couponRedemptions.couponId, coupon.id),
          eq(couponRedemptions.userId, userId)
        )
      );
    if ((row?.n ?? 0) >= coupon.perUserLimit)
      return "You have already used this coupon the maximum number of times.";
  }

  if (coupon.perIpLimit !== null && ip) {
    const [row] = await exec
      .select({ n: sql<number>`count(*)::int` })
      .from(couponRedemptions)
      .where(
        and(eq(couponRedemptions.couponId, coupon.id), eq(couponRedemptions.ip, ip))
      );
    if ((row?.n ?? 0) >= coupon.perIpLimit)
      return "This coupon has reached its usage limit for your network.";
  }

  return null;
}
