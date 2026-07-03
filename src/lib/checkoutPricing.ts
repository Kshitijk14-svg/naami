import { db } from "@/lib/db";
import { products } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getCouponByCode } from "@/db/queries/coupons";
import {
  computeDiscount,
  validateCouponWindow,
  checkRedemptionLimits,
  type CouponRow,
} from "@/lib/coupons";

// Server-side pricing: the client sends only productId/quantity/size; unit
// prices always come from the database so a tampered payload cannot change
// what gets charged.

export class CheckoutPricingError extends Error {}

export interface CartItemInput {
  productId: number;
  quantity: number;
  size?: string;
}

export interface PricedItem {
  productId: number;
  name: string;
  unitPriceInr: number;
  quantity: number;
  size?: string;
}

export async function priceCart(
  items: CartItemInput[]
): Promise<{ subtotalInr: number; pricedItems: PricedItem[] }> {
  if (!items.length) throw new CheckoutPricingError("Cart is empty.");

  for (const item of items) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new CheckoutPricingError("Invalid cart item.");
    }
  }

  const ids = [...new Set(items.map((i) => i.productId))];
  // Read from the primary — price accuracy matters more than replica offload here.
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      priceInr: products.priceInr,
      isPublished: products.isPublished,
      deletedAt: products.deletedAt,
    })
    .from(products)
    .where(inArray(products.id, ids));

  const byId = new Map(rows.map((r) => [r.id, r]));

  const pricedItems: PricedItem[] = items.map((item) => {
    const product = byId.get(item.productId);
    if (!product || product.deletedAt || !product.isPublished) {
      throw new CheckoutPricingError("One or more items are no longer available.");
    }
    return {
      productId: item.productId,
      name: product.name,
      unitPriceInr: product.priceInr,
      quantity: item.quantity,
      size: item.size,
    };
  });

  const subtotalInr = pricedItems.reduce((sum, i) => sum + i.unitPriceInr * i.quantity, 0);
  return { subtotalInr, pricedItems };
}

/**
 * Load + fully validate a coupon for this user/IP/subtotal and compute the
 * discount server-side. Advisory outside a transaction — createOrder repeats
 * the checks under its FOR UPDATE lock as the authoritative gate.
 */
export async function resolveCoupon(
  code: string,
  subtotalInr: number,
  userId: number,
  ip: string | null
): Promise<{ coupon: CouponRow; discountInr: number } | { error: string }> {
  const coupon = await getCouponByCode(code);
  if (!coupon) return { error: "Invalid or inactive coupon." };

  const windowError = validateCouponWindow(coupon, subtotalInr);
  if (windowError) return { error: windowError };

  const limitError = await checkRedemptionLimits(db, coupon, userId, ip);
  if (limitError) return { error: limitError };

  return { coupon, discountInr: computeDiscount(coupon, subtotalInr) };
}
