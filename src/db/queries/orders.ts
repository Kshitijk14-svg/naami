import { db, dbRead } from "@/lib/db";
import {
  orders,
  orderItems,
  coupons,
  products,
  couponRedemptions,
  orderStatusHistory,
} from "@/db/schema";
import { eq, and, or, sql, desc, isNull, inArray, lt, gte, lte, ilike } from "drizzle-orm";
import { enqueueJob } from "@/lib/jobs";
import { computeDiscount, validateCouponWindow, checkRedemptionLimits } from "@/lib/coupons";
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

function makeOrderId(): string {
  return `ORD-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export interface CreateOrderInput {
  userId: number;
  items: {
    productId: number;
    name: string;
    unitPriceInr: number;
    quantity: number;
    size?: string;
  }[];
  /** Server-computed subtotal from DB prices — never client-sent. */
  subtotalInr: number;
  couponCode?: string;
  /** Client IP for per-IP coupon limits; null when unknown. */
  ip?: string | null;
  shippingName?: string;
  shippingEmail?: string;
  shippingPhone?: string;
  shippingAddress?: string; // JSON string
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

/**
 * Create an order atomically: validates coupon, increments usedCount,
 * locks product rows (deadlock prevention), inserts order + items, decrements stock.
 * Any violation rolls back everything.
 */
export async function createOrder(input: CreateOrderInput) {
  return db.transaction(async (tx) => {
    let couponId: number | null = null;
    let discountInr = 0;

    if (input.couponCode) {
      // FOR UPDATE prevents TOCTOU double-spend race on coupon usedCount
      const [coupon] = await tx
        .select()
        .from(coupons)
        .where(
          and(
            eq(coupons.code, input.couponCode.toUpperCase()),
            isNull(coupons.deletedAt)
          )
        )
        .for("update")
        .limit(1);

      if (!coupon) throw new Error("Invalid or inactive coupon");

      // Authoritative validation under the lock: window/limits/min-order,
      // then per-user + per-IP counts against coupon_redemptions.
      const windowError = validateCouponWindow(coupon, input.subtotalInr);
      if (windowError) throw new Error(windowError);

      const limitError = await checkRedemptionLimits(tx, coupon, input.userId, input.ip ?? null);
      if (limitError) throw new Error(limitError);

      couponId = coupon.id;
      discountInr = computeDiscount(coupon, input.subtotalInr);

      await tx
        .update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(eq(coupons.id, coupon.id));
    }

    // Lock product rows in ascending ID order — consistent ordering prevents deadlocks
    const sortedProductIds = [...new Set(input.items.map((i) => i.productId))].sort(
      (a, b) => a - b
    );
    if (sortedProductIds.length > 0) {
      await tx
        .select({ id: products.id, stock: products.stock })
        .from(products)
        .where(sql`${products.id} = ANY(${sortedProductIds})`)
        .for("update");
    }

    const orderId = makeOrderId();
    const [order] = await tx
      .insert(orders)
      .values({
        id: orderId,
        userId: input.userId,
        totalInr: Math.max(0, input.subtotalInr - discountInr),
        discountInr,
        couponId,
        status: "pending",
        shippingName: input.shippingName ?? null,
        shippingEmail: input.shippingEmail ?? null,
        shippingPhone: encryptPII(input.shippingPhone),
        shippingAddress: encryptPII(input.shippingAddress),
        razorpayOrderId: input.razorpayOrderId ?? null,
        razorpayPaymentId: input.razorpayPaymentId ?? null,
      })
      .returning();

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

    // Redemption audit row — powers per-user/per-IP limits. Same transaction,
    // so a rollback also releases the redemption.
    if (couponId !== null) {
      await tx.insert(couponRedemptions).values({
        couponId,
        orderId,
        userId: input.userId,
        ip: input.ip ?? null,
        discountInr,
      });
    }

    // Decrement stock for each product
    for (const item of input.items) {
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${item.quantity}` })
        .where(eq(products.id, item.productId));
    }

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
            // Use plaintext input for the email — the stored columns are encrypted.
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

    // Low-stock check on the affected products (post-decrement), also enqueued.
    const affectedIds = [...new Set(input.items.map((i) => i.productId))];
    const lowStock = await tx
      .select({
        name: products.name,
        number: products.number,
        stock: products.stock,
        lowStockThreshold: products.lowStockThreshold,
      })
      .from(products)
      .where(
        and(
          inArray(products.id, affectedIds),
          lt(products.stock, products.lowStockThreshold)
        )
      );
    if (lowStock.length > 0) {
      await enqueueJob("email:low_stock", { items: lowStock }, tx);
    }

    return order;
  });
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

export async function getOrderById(id: string) {
  const rows = await dbRead.select().from(orders).where(eq(orders.id, id)).limit(1);
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

/** Update internal admin fields (notes/tracking) without a status change. */
export async function updateOrderAdminFields(
  id: string,
  fields: { adminNotes?: string; trackingNumber?: string; trackingCarrier?: string; trackingUrl?: string }
) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (fields.adminNotes !== undefined) set.adminNotes = fields.adminNotes || null;
  if (fields.trackingNumber !== undefined) set.trackingNumber = fields.trackingNumber || null;
  if (fields.trackingCarrier !== undefined) set.trackingCarrier = fields.trackingCarrier || null;
  if (fields.trackingUrl !== undefined) set.trackingUrl = fields.trackingUrl || null;

  const [updated] = await db.update(orders).set(set).where(eq(orders.id, id)).returning();
  return updated ? decryptOrderRow(updated) : null;
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
