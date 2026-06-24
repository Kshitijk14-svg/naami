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
        shippingPhone: input.shippingPhone ?? null,
        shippingAddress: input.shippingAddress ?? null,
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
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
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
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}
