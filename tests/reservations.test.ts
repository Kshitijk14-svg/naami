/**
 * The purchase race.
 *
 * Before the hardening pass, stock was *checked* before payment (unlocked, in
 * priceCart) and *decremented* after it. Two buyers racing for the last unit
 * both passed the check, both paid, and the loser was told to contact support
 * with their money already taken.
 *
 * Holds are now taken at create-order time, so the contention happens in front
 * of the payment where losing costs nothing. These tests drive the real
 * prepareIntent path — the same code create-order calls.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { products, productSizes, checkoutIntents, stockReservations } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { prepareIntent } from "@/db/queries/checkoutIntents";
import {
  releaseExpiredReservations,
  availableStock,
  InsufficientStockError,
} from "@/db/queries/reservations";
import { priceCart, CheckoutPricingError } from "@/lib/checkoutPricing";
import { pinProduct, pricedItem, shipping, stockOf, activeHolds, cleanup, type Fixture } from "./helpers/db";

let f: Fixture & { userId: number; userEmail: string };

/** One checkout, exactly as create-order would open it. */
const openCheckout = (quantity = 1) =>
  prepareIntent({
    userId: f.userId,
    pricedItems: [pricedItem(f, quantity)],
    subtotalInr: f.unitPriceInr * quantity,
    shipping: shipping(f.userEmail),
  });

beforeAll(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

beforeEach(async () => {
  await cleanup();
  f = await pinProduct(1);
});

describe("the purchase race", () => {
  it("lets exactly one of two simultaneous buyers take the last unit", async () => {
    const results = await Promise.allSettled([openCheckout(), openCheckout()]);

    const won = results.filter((r) => r.status === "fulfilled");
    const lost = results.filter((r) => r.status === "rejected");

    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
  });

  it("rejects the loser with InsufficientStockError, not a generic failure", async () => {
    const results = await Promise.allSettled([openCheckout(), openCheckout()]);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;

    // The route maps this specific class to a clean 409. Anything else becomes
    // a 500 with the customer mid-checkout.
    expect(rejected.reason).toBeInstanceOf(InsufficientStockError);
  });

  it("leaves exactly one active hold", async () => {
    await Promise.allSettled([openCheckout(), openCheckout()]);

    const holds = await activeHolds(f);
    expect(holds).toHaveLength(1);
    expect(holds[0].quantity).toBe(1);
  });

  it("does not decrement raw stock before payment", async () => {
    await Promise.allSettled([openCheckout(), openCheckout()]);

    // The unit is *held*, not sold. Decrementing here would lose inventory
    // whenever a customer abandoned the payment screen.
    expect(await stockOf(f)).toBe(1);
  });

  it("reports the held unit as unavailable", async () => {
    await openCheckout();

    const avail = await availableStock([f.productId]);
    expect(avail.get(`${f.productId}::${f.size}`)).toBe(0);
  });

  it("turns a third buyer away before they reach payment", async () => {
    await openCheckout();

    await expect(openCheckout()).rejects.toBeInstanceOf(InsufficientStockError);
  });

  it("blocks a quantity larger than the remaining stock", async () => {
    f = await pinProduct(3);

    await expect(openCheckout(5)).rejects.toBeInstanceOf(InsufficientStockError);
  });

  it("allows a quantity exactly equal to stock", async () => {
    f = await pinProduct(3);

    await expect(openCheckout(3)).resolves.toBeDefined();
  });
});

describe("the expiry sweeper", () => {
  it("releases a lapsed hold and expires its intent", async () => {
    const intent = await openCheckout();
    const past = new Date(Date.now() - 60_000);

    await db
      .update(stockReservations)
      .set({ expiresAt: past })
      .where(eq(stockReservations.intentId, intent.intentId));
    await db
      .update(checkoutIntents)
      .set({ expiresAt: past })
      .where(eq(checkoutIntents.id, intent.intentId));

    const swept = await releaseExpiredReservations();

    expect(swept.reservationsReleased).toBeGreaterThanOrEqual(1);
    expect(swept.intentsExpired).toBeGreaterThanOrEqual(1);

    const [row] = await db
      .select({ status: checkoutIntents.status })
      .from(checkoutIntents)
      .where(eq(checkoutIntents.id, intent.intentId));
    expect(row.status).toBe("expired");

    expect(await activeHolds(f)).toHaveLength(0);
  });

  it("makes the unit buyable again once the hold lapses", async () => {
    const intent = await openCheckout();
    const past = new Date(Date.now() - 60_000);

    await db.update(stockReservations).set({ expiresAt: past })
      .where(eq(stockReservations.intentId, intent.intentId));
    await db.update(checkoutIntents).set({ expiresAt: past })
      .where(eq(checkoutIntents.id, intent.intentId));
    await releaseExpiredReservations();

    const avail = await availableStock([f.productId]);
    expect(avail.get(`${f.productId}::${f.size}`)).toBe(1);

    await expect(openCheckout()).resolves.toBeDefined();
  });

  it("leaves a live hold alone", async () => {
    await openCheckout();

    const swept = await releaseExpiredReservations();

    expect(swept.reservationsReleased).toBe(0);
    expect(await activeHolds(f)).toHaveLength(1);
  });
});

describe("quantity limits", () => {
  beforeEach(async () => {
    // Take stock out of the equation so the cap is what is being measured.
    f = await pinProduct(9999);
  });

  it("rejects more than 20 of one line", async () => {
    await expect(
      priceCart([{ productId: f.productId, quantity: 21, size: f.size }])
    ).rejects.toBeInstanceOf(CheckoutPricingError);
  });

  it("allows exactly 20", async () => {
    await expect(
      priceCart([{ productId: f.productId, quantity: 20, size: f.size }])
    ).resolves.toBeDefined();
  });

  it("rejects a zero quantity", async () => {
    await expect(
      priceCart([{ productId: f.productId, quantity: 0, size: f.size }])
    ).rejects.toBeInstanceOf(CheckoutPricingError);
  });

  it("rejects a negative quantity", async () => {
    await expect(
      priceCart([{ productId: f.productId, quantity: -1, size: f.size }])
    ).rejects.toBeInstanceOf(CheckoutPricingError);
  });

  it("rejects a fractional quantity", async () => {
    await expect(
      priceCart([{ productId: f.productId, quantity: 1.5, size: f.size }])
    ).rejects.toBeInstanceOf(CheckoutPricingError);
  });

  it("rejects an empty cart", async () => {
    await expect(priceCart([])).rejects.toBeInstanceOf(CheckoutPricingError);
  });

  it("prices from the catalogue, ignoring any client-supplied price", async () => {
    const { subtotalInr, pricedItems } = await priceCart([
      // A tampered body would carry fields like this; they must not be read.
      { productId: f.productId, quantity: 2, size: f.size, priceInr: 1, unitPriceInr: 1 } as never,
    ]);

    expect(pricedItems[0].unitPriceInr).toBe(f.unitPriceInr);
    expect(subtotalInr).toBe(f.unitPriceInr * 2);
  });

  it("counts duplicate lines for the same product cumulatively", async () => {
    f = await pinProduct(3);

    // Two legal lines that together exceed stock must still be rejected.
    await expect(
      priceCart([
        { productId: f.productId, quantity: 2, size: f.size },
        { productId: f.productId, quantity: 2, size: f.size },
      ])
    ).rejects.toBeInstanceOf(CheckoutPricingError);
  });
});

describe("database backstops", () => {
  it("refuses negative size stock", async () => {
    await expect(
      db
        .update(productSizes)
        .set({ stock: -1 })
        .where(and(eq(productSizes.productId, f.productId), eq(productSizes.size, f.size)))
    ).rejects.toThrow();
  });

  it("refuses negative product stock", async () => {
    await expect(
      db.update(products).set({ stock: -1 }).where(eq(products.id, f.productId))
    ).rejects.toThrow();
  });

  it("refuses a non-positive reservation quantity", async () => {
    const intent = await openCheckout();

    await expect(
      db.insert(stockReservations).values({
        intentId: intent.intentId,
        productId: f.productId,
        size: f.size,
        quantity: 0,
        expiresAt: new Date(Date.now() + 60_000),
      })
    ).rejects.toThrow();
  });

  it("refuses two intents sharing one gateway order id", async () => {
    const a = await openCheckout();
    f = await pinProduct(5);
    const b = await openCheckout();

    const shared = `order_dupe_${Date.now()}`;
    await db
      .update(checkoutIntents)
      .set({ razorpayOrderId: shared })
      .where(eq(checkoutIntents.id, a.intentId));

    await expect(
      db
        .update(checkoutIntents)
        .set({ razorpayOrderId: shared })
        .where(eq(checkoutIntents.id, b.intentId))
    ).rejects.toThrow();
  });
});

describe("infinite-stock products", () => {
  it("takes no hold when trackStock is off", async () => {
    await db.update(products).set({ trackStock: false }).where(eq(products.id, f.productId));

    await openCheckout(50);

    // Nothing to reserve, so nothing is held — but the line still had to pass
    // the per-line cap, which is the only bound on these products.
    const holds = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(stockReservations)
      .where(eq(stockReservations.productId, f.productId));
    expect(holds[0].n).toBe(0);
  });
});
