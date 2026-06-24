import { db } from "@/lib/db";
import { orders, orderItems } from "@/db/schema";
import { sql, desc } from "drizzle-orm";

export async function getAnalytics() {
  const [revenueResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${orders.totalInr}), 0)`,
    })
    .from(orders)
    .where(sql`${orders.status} IN ('shipped', 'delivered')`);

  const countsByStatus = await db
    .select({
      status: orders.status,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(orders)
    .groupBy(orders.status);

  const topProducts = await db
    .select({
      productId: orderItems.productId,
      productName: orderItems.productName,
      count: sql<number>`SUM(${orderItems.quantity})::int`,
      revenue: sql<number>`SUM(${orderItems.unitPriceInr} * ${orderItems.quantity})::int`,
    })
    .from(orderItems)
    .groupBy(orderItems.productId, orderItems.productName)
    .orderBy(desc(sql`SUM(${orderItems.quantity})`))
    .limit(5);

  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(5);

  const orderCounts: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };
  for (const row of countsByStatus) {
    orderCounts[row.status] = row.count;
  }

  return {
    totalRevenue: revenueResult.total,
    orderCounts,
    topProducts,
    recentOrders,
  };
}
