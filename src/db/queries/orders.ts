import { db, dbRead } from "@/lib/db";
import {
  orders,
  orderItems,
  coupons,
  products,
  productSizes,
  couponRedemptions,
  orderStatusHistory,
} from "@/db/schema";
import { eq, and, or, sql, desc, isNull, inArray, gte, lte, ilike } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { enqueueJob } from "@/lib/jobs";
import {
  lockStockRows,
  consumeReservations,
  InsufficientStockError,
} from "@/db/queries/reservations";
import { canTransition, ORDER_TRANSITIONS } from "@/lib/orderStatus";
import {
  encryptField,
  decryptField,
  isEncrypted,
  isEncryptionConfigured,
} from "@/lib/crypto";

// PII (phone/address) is encrypted at rest when ENCRYPTION_KEY is configured.
// isEncrypted() guards decode so pre-existing plaintext rows still read correctly.
function encryptPII(value?: string | null): string | null {
  if (!value) return null;
  return isEncryptionConfigured() ? encryptField(value) : value;
}
function decryptPII(value: string | null): string | null {
  return isEncrypted(value) ? decryptField(value) : value;
}
function decryptOrderRow<T extends { shippingPhone: string | null; shippingAddress: string | null }>(
  order: T
): T {
  return {
    ...order,
    shippingPhone: decryptPII(order.shippingPhone),
    shippingAddress: decryptPII(order.shippingAddress),
  };
}

export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const ORDER_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
const MAX_ORDER_ID_ATTEMPTS = 5;

/**
 * Random, non-sequential order id. The old scheme took the low six base-36
 * digits of Date.now(), which collided for orders in the same millisecond and
 * let anyone guess neighbouring ids.
 */
function makeOrderId(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += ORDER_ID_ALPHABET[bytes[i] % ORDER_ID_ALPHABET.length];
  }
  return `ORD-${out}`;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Re-exported so existing callers keep importing it from here.
export { InsufficientStockError };

export interface CreateOrderInput {
  userId: number;
  items: {
    productId: number;
    name: string;
    unitPriceInr: number;
    quantity: number;
    size?: string;
  }[];
  /** Subtotal from the intent snapshot — priced from DB rows, never client-sent. */
  subtotalInr: number;
  /**
   * Discount settled when the coupon was held at create-order time. Taken as
   * given: the customer was already charged subtotal minus this, so re-deriving
   * it here could make the recorded total disagree with the money captured.
   */
  discountInr: number;
  /** Coupon whose use was reserved for this intent, if any. */
  couponId?: number | null;
  /** The checkout intent being fulfilled — owns the stock and coupon holds. */
  intentId?: number;
  shippingName?: string;
  shippingEmail?: string;
  shippingPhone?: string;
  shippingAddress?: string; // JSON string
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  /** What the gateway reported it actually captured, in whole rupees. */
  paidAmountInr?: number;
  paymentStatus?: "pending" | "paid" | "failed" | "refunded";
}

/**
 * Create an order atomically from an already-paid checkout intent.
 *
 * By the time this runs the money has moved, so it must not make judgement
 * calls that could reject a paid customer: pricing, the coupon and the stock
 * hold were all settled at create-order time, before payment. What is left here
 * is bookkeeping — write the order, consume the hold, decrement stock, link the
 * coupon redemption. Any violation rolls the whole thing back.
 */
export async function createOrder(input: CreateOrderInput) {
  return db.transaction(async (tx) => {
    // Lock the stock rows first, in the same ascending-id order every other
    // path uses, so concurrent checkouts queue instead of deadlocking.
    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const { productRows, sizeRows } = await lockStockRows(tx, productIds);

    const trackStockMap = new Map(productRows.map((r) => [r.id, r.trackStock]));
    const productsWithSizes = new Set(sizeRows.map((r) => r.productId));
    const sizeStockRemaining = new Map(
      sizeRows.map((r) => [`${r.productId}::${r.size}`, r.stock])
    );

    const discountInr = input.discountInr;
    const totalInr = Math.max(0, input.subtotalInr - discountInr);

    const orderId = await insertOrderRow(tx, input, { totalInr, discountInr });

    await tx.insert(orderItems).values(
      input.items.map((item) => ({
        orderId,
        productId: item.productId,
        productName: item.name,
        unitPriceInr: item.unitPriceInr,
        quantity: item.quantity,
        size: item.size ?? null,
      }))
    );

    // Link the coupon redemption reserved when the intent was created. The use
    // was already counted then; this just attaches it to the real order.
    if (input.intentId !== undefined) {
      await tx
        .update(couponRedemptions)
        .set({ orderId })
        .where(
          and(
            eq(couponRedemptions.intentId, input.intentId),
            isNull(couponRedemptions.orderId)
          )
        );

      // Convert the stock hold into a real decrement. Both happen in this
      // transaction, so units are never counted twice or dropped in between.
      await consumeReservations(tx, input.intentId);
    }

    for (const item of input.items) {
      if (trackStockMap.get(item.productId) === false) continue; // infinite stock

      if (productsWithSizes.has(item.productId)) {
        const sizeKey = `${item.productId}::${item.size ?? ""}`;
        // The `stock >= quantity` predicate is the backstop: if the lock above
        // were ever missed, this matches zero rows instead of driving stock
        // negative, and the rowCount assertion turns that into a rollback.
        const updated = await tx
          .update(productSizes)
          .set({ stock: sql`${productSizes.stock} - ${item.quantity}` })
          .where(
            and(
              eq(productSizes.productId, item.productId),
              eq(productSizes.size, item.size ?? ""),
              gte(productSizes.stock, item.quantity)
            )
          )
          .returning({ stock: productSizes.stock });

        if (updated.length !== 1) {
          throw new InsufficientStockError(
            `Not enough stock for "${item.name}"${item.size ? ` (${item.size})` : ""}.`
          );
        }
        sizeStockRemaining.set(sizeKey, updated[0].stock);
      }

      const updatedProduct = await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${item.quantity}` })
        .where(and(eq(products.id, item.productId), gte(products.stock, item.quantity)))
        .returning({ stock: products.stock });

      if (updatedProduct.length !== 1) {
        throw new InsufficientStockError(`Not enough stock for "${item.name}".`);
      }
    }

    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    // Side effects go through the transactional outbox: enqueued in THIS
    // transaction so they're created iff the order commits, then delivered
    // asynchronously with retries by the jobs worker (see src/lib/jobs.ts).
    if (input.shippingEmail) {
      await enqueueJob(
        "email:order_confirmation",
        {
          to: input.shippingEmail,
          order: {
            id: order.id,
            totalInr: order.totalInr,
            // Use plaintext input for the email — stored columns are encrypted.
            shippingName: input.shippingName ?? null,
            shippingAddress: input.shippingAddress ?? null,
          },
          items: input.items.map((i) => ({
            productName: i.name,
            unitPriceInr: i.unitPriceInr,
            quantity: i.quantity,
            size: i.size ?? null,
          })),
        },
        tx
      );
    }

    await enqueueLowStockAlerts(tx, input, { productsWithSizes, sizeStockRemaining });

    return order;
  });
}

/**
 * Insert the order row, retrying on an id collision.
 *
 * Order ids are random rather than time-derived: the previous scheme kept only
 * the low digits of the millisecond clock, so two orders in the same
 * millisecond collided outright — and a collision here means a primary-key
 * violation on a transaction that already has a captured payment behind it.
 */
async function insertOrderRow(
  tx: Tx,
  input: CreateOrderInput,
  amounts: { totalInr: number; discountInr: number }
): Promise<string> {
  const values = {
    userId: input.userId,
    totalInr: amounts.totalInr,
    discountInr: amounts.discountInr,
    couponId: input.couponId ?? null,
    status: "pending" as const,
    paymentStatus: input.paymentStatus ?? ("pending" as const),
    paidAmountInr: input.paidAmountInr ?? null,
    shippingName: input.shippingName ?? null,
    shippingEmail: input.shippingEmail ?? null,
    shippingPhone: encryptPII(input.shippingPhone),
    shippingAddress: encryptPII(input.shippingAddress),
    razorpayOrderId: input.razorpayOrderId ?? null,
    razorpayPaymentId: input.razorpayPaymentId ?? null,
  };

  for (let attempt = 0; attempt < MAX_ORDER_ID_ATTEMPTS; attempt++) {
    const [row] = await tx
      .insert(orders)
      .values({ id: makeOrderId(), ...values })
      .onConflictDoNothing({ target: orders.id })
      .returning({ id: orders.id });
    if (row) return row.id;
  }
  throw new Error("Could not allocate a unique order id.");
}

/**
 * Low-stock alerts for the products this order touched, batched into one job.
 * Checks both the product aggregate and each individual size — a size selling
 * out completely otherwise hides behind other sizes keeping the total healthy.
 */
async function enqueueLowStockAlerts(
  tx: Tx,
  input: CreateOrderInput,
  ctx: { productsWithSizes: Set<number>; sizeStockRemaining: Map<string, number> }
): Promise<void> {
  const affectedIds = [...new Set(input.items.map((i) => i.productId))];
  if (affectedIds.length === 0) return;

  const affectedProducts = await tx
    .select({
      id: products.id,
      name: products.name,
      number: products.number,
      stock: products.stock,
      lowStockThreshold: products.lowStockThreshold,
      trackStock: products.trackStock,
    })
    .from(products)
    .where(inArray(products.id, affectedIds));

  const lowStock: { name: string; number: string; stock: number; lowStockThreshold: number }[] = [];
  const productById = new Map(affectedProducts.map((p) => [p.id, p]));

  for (const p of affectedProducts) {
    if (p.trackStock && p.stock < p.lowStockThreshold) {
      lowStock.push({
        name: p.name,
        number: p.number,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
      });
    }
  }

  const touchedSizeKeys = new Set(
    input.items
      .filter((i) => ctx.productsWithSizes.has(i.productId))
      .map((i) => `${i.productId}::${i.size ?? ""}`)
  );
  for (const key of touchedSizeKeys) {
    const [productIdStr, size] = key.split("::");
    const p = productById.get(Number(productIdStr));
    if (!p || !p.trackStock) continue;
    const remaining = ctx.sizeStockRemaining.get(key);
    if (remaining !== undefined && remaining < p.lowStockThreshold) {
      lowStock.push({
        name: `${p.name} — Size ${size}`,
        number: p.number,
        stock: remaining,
        lowStockThreshold: p.lowStockThreshold,
      });
    }
  }

  if (lowStock.length > 0) {
    await enqueueJob("email:low_stock", { items: lowStock }, tx);
  }
}

export async function getAllOrders() {
  const rows = await dbRead.select().from(orders).orderBy(desc(orders.createdAt));
  return rows.map(decryptOrderRow);
}

export async function getOrdersByUserId(userId: number) {
  const rows = await dbRead
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
  return rows.map(decryptOrderRow);
}

export async function getOrdersByStatus(status: string) {
  if (!VALID_STATUSES.includes(status as OrderStatus)) return [];
  const rows = await dbRead
    .select()
    .from(orders)
    .where(eq(orders.status, status as OrderStatus))
    .orderBy(desc(orders.createdAt));
  return rows.map(decryptOrderRow);
}

// Reads the PRIMARY, not the replica: the order confirmation page calls this
// immediately after checkout writes the row, and under replication lag the
// replica would 404 an order the customer has just paid for.
export async function getOrderById(id: string) {
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return rows[0] ? decryptOrderRow(rows[0]) : null;
}

/** Idempotency guard: find an order already created for a gateway payment id. */
export async function getOrderByRazorpayPaymentId(paymentId: string) {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.razorpayPaymentId, paymentId))
    .limit(1);
  return rows[0] ? decryptOrderRow(rows[0]) : null;
}

/** Thrown when a status change violates the transition matrix — maps to HTTP 409. */
export class InvalidTransitionError extends Error {
  allowed: OrderStatus[];
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Cannot change order status from "${from}" to "${to}".`);
    this.allowed = ORDER_TRANSITIONS[from] ?? [];
  }
}

export interface UpdateOrderStatusOptions {
  note?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
}

/**
 * Put a cancelled order's units back. Locks the product rows in the same
 * ascending-id order as every other stock path so this can never deadlock
 * against a concurrent checkout.
 */
async function restoreOrderInventory(tx: Tx, orderId: string): Promise<void> {
  const items = await tx
    .select({
      productId: orderItems.productId,
      quantity: orderItems.quantity,
      size: orderItems.size,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  if (items.length === 0) return;

  const { productRows, sizeRows } = await lockStockRows(
    tx,
    items.map((i) => i.productId)
  );
  const trackStock = new Map(productRows.map((r) => [r.id, r.trackStock]));
  const sizedProducts = new Set(sizeRows.map((r) => r.productId));

  for (const item of items) {
    if (trackStock.get(item.productId) === false) continue; // infinite stock
    if (sizedProducts.has(item.productId)) {
      await tx
        .update(productSizes)
        .set({ stock: sql`${productSizes.stock} + ${item.quantity}` })
        .where(
          and(
            eq(productSizes.productId, item.productId),
            eq(productSizes.size, item.size ?? "")
          )
        );
    }
    await tx
      .update(products)
      .set({ stock: sql`${products.stock} + ${item.quantity}` })
      .where(eq(products.id, item.productId));
  }
}

/**
 * Change an order's status atomically: validates the transition under a row
 * lock, records it in order_status_history, optionally sets tracking fields,
 * and enqueues a customer notification email via the transactional outbox.
 */
export async function updateOrderStatus(
  id: string,
  status: string,
  changedBy: string,
  opts: UpdateOrderStatusOptions = {}
) {
  if (!VALID_STATUSES.includes(status as OrderStatus)) return null;
  const toStatus = status as OrderStatus;

  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .for("update")
      .limit(1);
    if (!order) return null;

    if (!canTransition(order.status, toStatus)) {
      throw new InvalidTransitionError(order.status, toStatus);
    }

    const [updated] = await tx
      .update(orders)
      .set({
        status: toStatus,
        updatedAt: new Date(),
        ...(opts.trackingNumber !== undefined && { trackingNumber: opts.trackingNumber || null }),
        ...(opts.trackingCarrier !== undefined && { trackingCarrier: opts.trackingCarrier || null }),
        ...(opts.trackingUrl !== undefined && { trackingUrl: opts.trackingUrl || null }),
      })
      .where(eq(orders.id, id))
      .returning();

    await tx.insert(orderStatusHistory).values({
      orderId: id,
      fromStatus: order.status,
      toStatus,
      changedBy,
      note: opts.note || null,
    });

    // Cancelling returns the goods to the shelf and the coupon to its pool.
    // Without this, cancelled orders burned inventory permanently.
    if (toStatus === "cancelled") {
      await restoreOrderInventory(tx, id);
      if (order.couponId !== null) {
        await tx
          .update(coupons)
          .set({ usedCount: sql`GREATEST(${coupons.usedCount} - 1, 0)` })
          .where(eq(coupons.id, order.couponId));
        await tx.delete(couponRedemptions).where(eq(couponRedemptions.orderId, id));
      }
    }

    if (order.shippingEmail) {
      await enqueueJob(
        "email:order_status",
        {
          to: order.shippingEmail,
          orderId: id,
          toStatus,
          shippingName: order.shippingName,
          tracking: {
            number: updated.trackingNumber,
            carrier: updated.trackingCarrier,
            url: updated.trackingUrl,
          },
        },
        tx
      );
    }

    return decryptOrderRow(updated);
  });
}

/**
 * Update internal admin fields (notes/tracking) without a status change.
 * If the order is already "shipped" and a tracking field actually changes
 * (old vs new compare, so re-submitting the same values is a no-op), enqueue
 * a customer notification email via the transactional outbox, mirroring
 * updateOrderStatus's pattern.
 */
export async function updateOrderAdminFields(
  id: string,
  fields: { adminNotes?: string; trackingNumber?: string; trackingCarrier?: string; trackingUrl?: string }
) {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .for("update")
      .limit(1);
    if (!order) return null;

    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (fields.adminNotes !== undefined) set.adminNotes = fields.adminNotes || null;
    if (fields.trackingNumber !== undefined) set.trackingNumber = fields.trackingNumber || null;
    if (fields.trackingCarrier !== undefined) set.trackingCarrier = fields.trackingCarrier || null;
    if (fields.trackingUrl !== undefined) set.trackingUrl = fields.trackingUrl || null;

    const [updated] = await tx
      .update(orders)
      .set(set)
      .where(eq(orders.id, id))
      .returning();

    const trackingChanged =
      order.trackingNumber !== updated.trackingNumber ||
      order.trackingCarrier !== updated.trackingCarrier ||
      order.trackingUrl !== updated.trackingUrl;

    if (
      order.status === "shipped" &&
      trackingChanged &&
      updated.trackingNumber &&
      order.shippingEmail
    ) {
      // shippingEmail/shippingName are not encrypted columns (see decryptOrderRow,
      // which only handles shippingPhone/shippingAddress) — use the raw order
      // fields directly here, matching updateOrderStatus's email-payload sourcing.
      await enqueueJob(
        "email:order_status",
        {
          to: order.shippingEmail,
          orderId: id,
          toStatus: "tracking_updated",
          shippingName: order.shippingName,
          tracking: {
            number: updated.trackingNumber,
            carrier: updated.trackingCarrier,
            url: updated.trackingUrl,
          },
        },
        tx
      );
    }

    return decryptOrderRow(updated);
  });
}

export async function getOrderStatusHistory(orderId: string) {
  return dbRead
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(desc(orderStatusHistory.createdAt));
}

export interface SearchOrdersInput {
  q?: string;
  status?: string;
  /** UTC ISO bounds (caller converts IST dates). */
  from?: string;
  to?: string;
}

/** Admin order search: id/email text match + status + created-at range. */
export async function searchOrders(input: SearchOrdersInput) {
  const conditions = [];

  if (input.q) {
    const like = `%${input.q.trim()}%`;
    conditions.push(or(ilike(orders.id, like), ilike(orders.shippingEmail, like)));
  }
  if (input.status && VALID_STATUSES.includes(input.status as OrderStatus)) {
    conditions.push(eq(orders.status, input.status as OrderStatus));
  }
  if (input.from) {
    const from = new Date(input.from);
    if (!isNaN(from.getTime())) conditions.push(gte(orders.createdAt, from));
  }
  if (input.to) {
    const to = new Date(input.to);
    if (!isNaN(to.getTime())) conditions.push(lte(orders.createdAt, to));
  }

  const rows = await dbRead
    .select()
    .from(orders)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt));
  return rows.map(decryptOrderRow);
}

export async function getOrderItems(orderId: string) {
  return dbRead.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export interface OrderAnalytics {
  totalRevenue: number;
  orderCounts: Record<OrderStatus, number>;
  topProducts: { productId: number; name: string; count: number; revenue: number }[];
  recentOrders: {
    id: string;
    shippingName: string | null;
    totalInr: number;
    status: OrderStatus;
    createdAt: Date;
  }[];
}

/** Dashboard analytics computed from real order data. */
export async function getOrderAnalytics(): Promise<OrderAnalytics> {
  const [countRows, revenueRow, topRows, recentRows] = await Promise.all([
    dbRead
      .select({ status: orders.status, n: sql<number>`count(*)::int` })
      .from(orders)
      .groupBy(orders.status),
    dbRead
      .select({ total: sql<number>`coalesce(sum(${orders.totalInr}), 0)::int` })
      .from(orders)
      .where(inArray(orders.status, ["shipped", "delivered"])),
    dbRead
      .select({
        productId: orderItems.productId,
        name: sql<string>`max(${orderItems.productName})`,
        count: sql<number>`sum(${orderItems.quantity})::int`,
        revenue: sql<number>`sum(${orderItems.unitPriceInr} * ${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(sql`${orders.status} != 'cancelled'`)
      .groupBy(orderItems.productId)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(5),
    dbRead
      .select({
        id: orders.id,
        shippingName: orders.shippingName,
        totalInr: orders.totalInr,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(5),
  ]);

  const orderCounts = Object.fromEntries(VALID_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const row of countRows) orderCounts[row.status] = row.n;

  return {
    totalRevenue: revenueRow[0]?.total ?? 0,
    orderCounts,
    topProducts: topRows,
    recentOrders: recentRows,
  };
}
