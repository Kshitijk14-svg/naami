/**
 * Fixtures shared by the suites.
 *
 * Everything here drives the real schema and the real query modules — nothing
 * reimplements application logic, because a test that reimplements the thing it
 * is testing proves nothing.
 */
import { db } from "@/lib/db";
import {
  users,
  products,
  productSizes,
  stockReservations,
  checkoutIntents,
  paymentIncidents,
  orders,
} from "@/db/schema";
import { and, eq, inArray, isNull, like } from "drizzle-orm";

/** Every fixture row is prefixed so cleanup can find it unambiguously. */
export const TEST_PREFIX = "vitest-";

export interface Fixture {
  userId: number;
  userEmail: string;
  productId: number;
  productName: string;
  size: string;
  unitPriceInr: number;
}

/** A customer whose email is namespaced to this suite. */
export async function ensureUser(name: string): Promise<{ id: number; email: string }> {
  const email = `${TEST_PREFIX}${name}@test.local`;
  const [row] = await db
    .insert(users)
    .values({ email, name: `Test ${name}`, role: "customer" })
    .onConflictDoUpdate({ target: users.email, set: { name: `Test ${name}` } })
    .returning({ id: users.id, email: users.email });
  return row;
}

/**
 * Borrow the first seeded product and pin it to a known state.
 *
 * We reuse a real catalogue row rather than inserting one so that the foreign
 * keys, size rows and pricing all behave exactly as they do in production.
 */
export async function pinProduct(stock: number): Promise<Fixture & { userId: number; userEmail: string }> {
  const [product] = await db.select().from(products).orderBy(products.id).limit(1);
  if (!product) {
    throw new Error("No products in the database. Run `npm run db:seed` first.");
  }

  const [size] = await db
    .select()
    .from(productSizes)
    .where(eq(productSizes.productId, product.id))
    .limit(1);
  if (!size) {
    throw new Error(`Product ${product.id} has no sizes. Run \`npm run db:seed\` first.`);
  }

  await db
    .update(products)
    .set({ trackStock: true, isPublished: true })
    .where(eq(products.id, product.id));

  await db
    .update(productSizes)
    .set({ stock })
    .where(and(eq(productSizes.productId, product.id), eq(productSizes.size, size.size)));

  // A previous run that died mid-test can leave holds behind, and a stale hold
  // silently changes what every stock assertion below means.
  await clearHolds(product.id);

  const user = await ensureUser("buyer");

  return {
    userId: user.id,
    userEmail: user.email,
    productId: product.id,
    productName: product.name,
    size: size.size,
    unitPriceInr: product.priceInr,
  };
}

/** The shape `prepareIntent` and `reserveStock` both expect. */
export function pricedItem(f: Fixture, quantity = 1) {
  return {
    productId: f.productId,
    name: f.productName,
    unitPriceInr: f.unitPriceInr,
    quantity,
    size: f.size,
  };
}

export function shipping(email: string) {
  return {
    name: "Test Buyer",
    email,
    phone: "9999999999",
    address: JSON.stringify({ line1: "1 Test St", city: "Testville", state: "TS", pincode: "000000" }),
  };
}

/** Current stock for the fixture's product/size, read fresh. */
export async function stockOf(f: Fixture): Promise<number> {
  const [row] = await db
    .select({ stock: productSizes.stock })
    .from(productSizes)
    .where(and(eq(productSizes.productId, f.productId), eq(productSizes.size, f.size)));
  return row?.stock ?? 0;
}

/** Reservations still counting against availability. */
export async function activeHolds(f: Fixture) {
  return db
    .select()
    .from(stockReservations)
    .where(
      and(eq(stockReservations.productId, f.productId), isNull(stockReservations.releasedAt))
    );
}

/**
 * Remove everything this suite created.
 *
 * Order matters: reservations and incidents reference intents, and intents
 * reference users, so children go first.
 */
export async function cleanup(): Promise<void> {
  const testUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, `${TEST_PREFIX}%`));
  const ids = testUsers.map((u) => u.id);

  if (ids.length > 0) {
    const intents = await db
      .select({ id: checkoutIntents.id })
      .from(checkoutIntents)
      .where(inArray(checkoutIntents.userId, ids));
    const intentIds = intents.map((i) => i.id);

    if (intentIds.length > 0) {
      await db.delete(stockReservations).where(inArray(stockReservations.intentId, intentIds));
      await db.delete(paymentIncidents).where(inArray(paymentIncidents.intentId, intentIds));
    }

    await db.delete(orders).where(inArray(orders.userId, ids));
    await db.delete(checkoutIntents).where(inArray(checkoutIntents.userId, ids));
  }

  // Incidents raised for orders we never issued carry no intent id.
  await db
    .delete(paymentIncidents)
    .where(like(paymentIncidents.razorpayOrderId, `order_${TEST_PREFIX}%`));

  if (ids.length > 0) {
    await db.delete(users).where(like(users.email, `${TEST_PREFIX}%`));
  }
}

/**
 * Reservations can outlive their intent if a previous run died mid-test. Clear
 * every hold on the fixture product so each test starts from a known baseline.
 */
export async function clearHolds(productId: number): Promise<void> {
  await db.delete(stockReservations).where(eq(stockReservations.productId, productId));
}

/** A gateway order id that cleanup() can recognise. */
export function testOrderId(suffix = ""): string {
  return `order_${TEST_PREFIX}${Date.now()}${suffix}`;
}
