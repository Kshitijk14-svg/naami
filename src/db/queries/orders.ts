import { db, dbRead } from "@/lib/db";
import { orders, orderItems, coupons, products } from "@/db/schema";
import { eq, and, sql, desc, isNull, inArray, lt } from "drizzle-orm";
import { enqueueJob } from "@/lib/jobs";
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
  totalInr: number;
  couponCode?: string;
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

      if (!coupon || !coupon.isActive)
        throw new Error("Invalid or inactive coupon");

      if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)
        throw new Error("Coupon usage limit reached");

      if (coupon.expiresAt && coupon.expiresAt < new Date())
        throw new Error("Coupon has expired");

      couponId = coupon.id;

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
        totalInr: input.totalInr,
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

export async function updateOrderStatus(id: string, status: string) {
  if (!VALID_STATUSES.includes(status as OrderStatus)) return null;
  const [updated] = await db
    .update(orders)
    .set({ status: status as OrderStatus, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning();
  return updated ?? null;
}

export async function getOrderItems(orderId: string) {
  return dbRead.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}
