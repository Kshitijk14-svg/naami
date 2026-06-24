import { db } from "@/lib/db";
import { orders, orderItems, coupons, products } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

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

/**
 * Create an order atomically: validates coupon, increments usedCount,
 * inserts order + items — all in a single PostgreSQL transaction.
 * Any violation rolls back everything.
 */
export async function createOrder(input: {
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
}) {
  return db.transaction(async (tx) => {
    let couponId: number | null = null;

    if (input.couponCode) {
      // FOR UPDATE locks the coupon row for the duration of the transaction,
      // preventing two concurrent orders from both reading usedCount < usageLimit
      // before either increments it (TOCTOU race / double-spend).
      const [coupon] = await tx
        .select()
        .from(coupons)
        .where(eq(coupons.code, input.couponCode.toUpperCase()))
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

    // Lock product rows in ascending ID order before any stock check/decrement.
    // Consistent ordering across concurrent transactions prevents circular waits
    // (the root cause of deadlocks on multi-product orders).
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

    return order;
  });
}

export async function getAllOrders() {
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getOrdersByStatus(status: string) {
  if (!VALID_STATUSES.includes(status as OrderStatus)) return [];
  return db
    .select()
    .from(orders)
    .where(eq(orders.status, status as OrderStatus))
    .orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: string) {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  return rows[0] ?? null;
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
  return db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
}
