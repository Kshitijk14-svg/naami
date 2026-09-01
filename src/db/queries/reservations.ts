import { db } from "@/lib/db";
import {
  products,
  productSizes,
  stockReservations,
  checkoutIntents,
  couponRedemptions,
  coupons,
} from "@/db/schema";
import { and, asc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

// Stock holds for in-flight checkouts.
//
// The problem this solves: stock used to be *checked* before payment (unlocked,
// in priceCart) and *decremented* after it (locked, in createOrder). Two people
// racing for the last unit both passed the check, both paid, and whoever lost
// the lock was told to contact support with their money already taken.
//
// Holding the units at create-order time moves that contention in front of the
// payment, where losing is just a 409 and nobody has been charged.
//
// A reservation is ACTIVE while `released_at IS NULL AND expires_at > now()`.
// Available = products/product_sizes.stock MINUS active reservations.

const log = createLogger("reservations");

/** How long a customer has to complete payment before their hold lapses. */
export const RESERVATION_TTL_MINUTES = 15;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

/** Thrown when requested quantity exceeds what is available after holds. */
export class InsufficientStockError extends Error {}

export interface ReservableItem {
  productId: number;
  name: string;
  quantity: number;
  size?: string;
}

/** Sizeless products key on the empty string, matching createOrder's convention. */
function key(productId: number, size?: string | null): string {
  return `${productId}::${size ?? ""}`;
}

/**
 * Sum of active holds per (productId, size), for the given products.
 *
 * `excludeIntentId` lets a transaction that is consuming its own hold see the
 * world without it — otherwise an intent would be blocked by itself.
 */
async function activeReservationTotals(
  exec: Executor,
  productIds: number[],
  excludeIntentId?: number
): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();

  const conditions = [
    inArray(stockReservations.productId, productIds),
    isNull(stockReservations.releasedAt),
    gt(stockReservations.expiresAt, new Date()),
  ];
  if (excludeIntentId !== undefined) {
    conditions.push(sql`${stockReservations.intentId} <> ${excludeIntentId}`);
  }

  const rows = await exec
    .select({
      productId: stockReservations.productId,
      size: stockReservations.size,
      held: sql<number>`COALESCE(SUM(${stockReservations.quantity}), 0)::int`,
    })
    .from(stockReservations)
    .where(and(...conditions))
    .groupBy(stockReservations.productId, stockReservations.size);

  return new Map(rows.map((r) => [key(r.productId, r.size), r.held]));
}

/**
 * Lock the stock rows for `productIds` in a deterministic order.
 *
 * The ORDER BY is load-bearing. createOrder's original comment claimed sorting
 * the JS id array prevented deadlocks, but sorting only reorders the IN (...)
 * list — Postgres still locks in plan order. Every path that takes these locks
 * (reserve, consume, createOrder) must agree on ascending id, or two overlapping
 * carts can deadlock and abort a transaction that has money riding on it.
 */
export async function lockStockRows(exec: Executor, productIds: number[]) {
  const sorted = [...new Set(productIds)].sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { productRows: [], sizeRows: [] };
  }

  const productRows = await exec
    .select({ id: products.id, stock: products.stock, trackStock: products.trackStock })
    .from(products)
    .where(inArray(products.id, sorted))
    .orderBy(asc(products.id))
    .for("update");

  const sizeRows = await exec
    .select({
      productId: productSizes.productId,
      size: productSizes.size,
      stock: productSizes.stock,
    })
    .from(productSizes)
    .where(inArray(productSizes.productId, sorted))
    .orderBy(asc(productSizes.productId), asc(productSizes.size))
    .for("update");

  return { productRows, sizeRows };
}

/**
 * Hold stock for an intent. Call inside the create-order transaction, before
 * the Razorpay order is opened.
 *
 * Throws InsufficientStockError when a line cannot be satisfied — at that point
 * no payment has happened, so the caller can return a clean 409.
 */
export async function reserveStock(
  tx: Tx,
  intentId: number,
  items: ReservableItem[],
  ttlMinutes: number = RESERVATION_TTL_MINUTES
): Promise<void> {
  const productIds = [...new Set(items.map((i) => i.productId))];
  const { productRows, sizeRows } = await lockStockRows(tx, productIds);

  const trackStock = new Map(productRows.map((r) => [r.id, r.trackStock]));
  const productStock = new Map(productRows.map((r) => [r.id, r.stock]));
  const sizeStock = new Map(sizeRows.map((r) => [key(r.productId, r.size), r.stock]));
  const hasSizes = new Set(sizeRows.map((r) => r.productId));

  const held = await activeReservationTotals(tx, productIds);

  // Running remainders, so several lines for the same product+size are checked
  // cumulatively rather than each against the full quantity.
  const remaining = new Map<string, number>();
  const remainingFor = (productId: number, size?: string): number => {
    const k = key(productId, size);
    if (remaining.has(k)) return remaining.get(k)!;
    const onHand = hasSizes.has(productId)
      ? (sizeStock.get(k) ?? 0)
      : (productStock.get(productId) ?? 0);
    const available = onHand - (held.get(k) ?? 0);
    remaining.set(k, available);
    return available;
  };

  const toInsert: (typeof stockReservations.$inferInsert)[] = [];
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

  for (const item of items) {
    if (trackStock.get(item.productId) === false) continue; // infinite stock

    if (hasSizes.has(item.productId) && !sizeStock.has(key(item.productId, item.size))) {
      throw new InsufficientStockError(
        `"${item.name}" is no longer available in size ${item.size ?? "—"}.`
      );
    }

    const available = remainingFor(item.productId, item.size);
    if (available < item.quantity) {
      const sizeNote = hasSizes.has(item.productId) && item.size ? ` (${item.size})` : "";
      throw new InsufficientStockError(
        `Only ${Math.max(0, available)} left of "${item.name}"${sizeNote}.`
      );
    }
    remaining.set(key(item.productId, item.size), available - item.quantity);

    toInsert.push({
      intentId,
      productId: item.productId,
      size: item.size ?? "",
      quantity: item.quantity,
      expiresAt,
    });
  }

  if (toInsert.length > 0) {
    await tx.insert(stockReservations).values(toInsert);
  }
}

/**
 * Mark an intent's holds as spent. Called inside createOrder's transaction at
 * the moment the real stock decrement happens, so the units are counted once:
 * as a hold until then, as decremented stock afterwards.
 */
export async function consumeReservations(tx: Tx, intentId: number): Promise<void> {
  await tx
    .update(stockReservations)
    .set({ releasedAt: new Date() })
    .where(
      and(eq(stockReservations.intentId, intentId), isNull(stockReservations.releasedAt))
    );
}

/** Give back an intent's holds without consuming them (failure/abandonment). */
export async function releaseReservations(
  exec: Executor,
  intentId: number
): Promise<void> {
  await exec
    .update(stockReservations)
    .set({ releasedAt: new Date() })
    .where(
      and(eq(stockReservations.intentId, intentId), isNull(stockReservations.releasedAt))
    );
}

/**
 * Sweep intents whose payment window lapsed: release their stock holds, hand
 * back the coupon use they were holding, and mark the intent expired.
 *
 * Driven by the jobs worker. Each intent is swept in its own transaction so one
 * bad row cannot stall the rest.
 */
export async function releaseExpiredReservations(): Promise<{
  intentsExpired: number;
  reservationsReleased: number;
}> {
  const now = new Date();

  const stale = await db
    .select({ id: checkoutIntents.id, couponCode: checkoutIntents.couponCode })
    .from(checkoutIntents)
    .where(and(eq(checkoutIntents.status, "created"), sql`${checkoutIntents.expiresAt} <= ${now}`))
    .limit(200);

  let reservationsReleased = 0;
  let intentsExpired = 0;

  for (const intent of stale) {
    try {
      await db.transaction(async (tx) => {
        // Re-check under the row lock: the browser may have completed payment
        // between the SELECT above and here, in which case leave it alone.
        const [current] = await tx
          .select({ id: checkoutIntents.id, status: checkoutIntents.status })
          .from(checkoutIntents)
          .where(eq(checkoutIntents.id, intent.id))
          .for("update")
          .limit(1);
        if (!current || current.status !== "created") return;

        const released = await tx
          .update(stockReservations)
          .set({ releasedAt: now })
          .where(
            and(
              eq(stockReservations.intentId, intent.id),
              isNull(stockReservations.releasedAt)
            )
          )
          .returning({ id: stockReservations.id });
        reservationsReleased += released.length;

        // Hand back the coupon use this intent was holding.
        const heldRedemptions = await tx
          .delete(couponRedemptions)
          .where(
            and(
              eq(couponRedemptions.intentId, intent.id),
              isNull(couponRedemptions.orderId)
            )
          )
          .returning({ couponId: couponRedemptions.couponId });

        for (const r of heldRedemptions) {
          await tx
            .update(coupons)
            .set({ usedCount: sql`GREATEST(${coupons.usedCount} - 1, 0)` })
            .where(eq(coupons.id, r.couponId));
        }

        await tx
          .update(checkoutIntents)
          .set({ status: "expired", updatedAt: now })
          .where(eq(checkoutIntents.id, intent.id));

        intentsExpired += 1;
      });
    } catch (err) {
      log.error("failed to expire intent", { intentId: intent.id, err });
    }
  }

  if (intentsExpired > 0) {
    log.info("expired stale checkout intents", { intentsExpired, reservationsReleased });
  }
  return { intentsExpired, reservationsReleased };
}

/**
 * Units a shopper can still buy right now: on-hand stock minus everyone's
 * active holds. Backs the cart availability endpoint so the storefront does not
 * advertise units that are already spoken for.
 */
export async function availableStock(
  productIds: number[]
): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();

  const [productRows, sizeRows, held] = await Promise.all([
    db
      .select({ id: products.id, stock: products.stock, trackStock: products.trackStock })
      .from(products)
      .where(inArray(products.id, productIds)),
    db
      .select({
        productId: productSizes.productId,
        size: productSizes.size,
        stock: productSizes.stock,
      })
      .from(productSizes)
      .where(inArray(productSizes.productId, productIds)),
    activeReservationTotals(db, productIds),
  ]);

  const out = new Map<string, number>();
  const hasSizes = new Set(sizeRows.map((r) => r.productId));

  for (const row of sizeRows) {
    const k = key(row.productId, row.size);
    out.set(k, Math.max(0, row.stock - (held.get(k) ?? 0)));
  }
  for (const row of productRows) {
    if (hasSizes.has(row.id)) continue;
    const k = key(row.id, "");
    out.set(k, Math.max(0, row.stock - (held.get(k) ?? 0)));
  }

  return out;
}
