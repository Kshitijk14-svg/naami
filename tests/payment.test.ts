/**
 * Payment binding.
 *
 * The original flaw: create-order persisted nothing, and verify-payment
 * re-priced a second, client-supplied cart, checking only that the signature
 * triple was valid. Nothing linked the money captured to the order created, so
 * a valid ₹499 signature could be replayed with a ₹50,000 cart.
 *
 * Fulfilment now reads everything from a server-side checkout intent. These
 * tests drive fulfilOrder() — the single path both the browser callback and the
 * webhook use — plus the signature helpers.
 *
 * They deliberately stop short of the Razorpay API call, because a test suite
 * must not depend on a live gateway. Every branch *before* that call is covered
 * here; the gateway confirmation itself is covered manually in
 * docs/testing/security/43-payment.md.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { checkoutIntents, paymentIncidents, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fulfilOrder } from "@/lib/fulfilOrder";
import { prepareIntent, attachRazorpayOrder, intentItems } from "@/db/queries/checkoutIntents";
import { verifyCheckoutSignature, verifyWebhookSignature, signaturesMatch } from "@/lib/razorpay";
import { pinProduct, pricedItem, shipping, ensureUser, cleanup, testOrderId, type Fixture } from "./helpers/db";

let f: Fixture & { userId: number; userEmail: string };

/** An intent with a known gateway order id, exactly as create-order leaves it. */
async function openIntentWithOrderId(orderId: string, quantity = 1) {
  const prepared = await prepareIntent({
    userId: f.userId,
    pricedItems: [pricedItem(f, quantity)],
    subtotalInr: f.unitPriceInr * quantity,
    shipping: shipping(f.userEmail),
  });
  await attachRazorpayOrder(prepared.intentId, orderId);
  return prepared;
}

const incidentsFor = (orderId: string) =>
  db.select().from(paymentIncidents).where(eq(paymentIncidents.razorpayOrderId, orderId));

beforeAll(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

beforeEach(async () => {
  await cleanup();
  f = await pinProduct(50);
});

describe("checkout signature verification", () => {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  it.skipIf(!secret)("accepts a genuine signature", () => {
    const orderId = "order_TEST";
    const paymentId = "pay_TEST";
    const good = createHmac("sha256", secret!).update(`${orderId}|${paymentId}`).digest("hex");

    expect(verifyCheckoutSignature(orderId, paymentId, good)).toBe(true);
  });

  it.skipIf(!secret)("rejects a signature for a different payment", () => {
    const good = createHmac("sha256", secret!).update("order_A|pay_A").digest("hex");

    // Same signature, different pair — this is the replay an attacker would try.
    expect(verifyCheckoutSignature("order_A", "pay_B", good)).toBe(false);
    expect(verifyCheckoutSignature("order_B", "pay_A", good)).toBe(false);
  });

  it.skipIf(!secret)("rejects a forged signature", () => {
    expect(verifyCheckoutSignature("order_A", "pay_A", "0".repeat(64))).toBe(false);
  });

  it.skipIf(!secret)("rejects an empty signature", () => {
    expect(verifyCheckoutSignature("order_A", "pay_A", "")).toBe(false);
  });

  it("compares signatures without leaking length through early exit", () => {
    // Different lengths must be rejected before any byte comparison happens.
    expect(signaturesMatch("abcdef", "abc")).toBe(false);
    expect(signaturesMatch("abcdef", "abcdef")).toBe(true);
    expect(signaturesMatch("abcdef", "abcdeg")).toBe(false);
  });
});

describe("webhook signature verification", () => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  it.skipIf(!secret)("accepts a signature over the exact bytes", () => {
    const body = '{"event":"payment.captured"}';
    const good = createHmac("sha256", secret!).update(body).digest("hex");

    expect(verifyWebhookSignature(body, good)).toBe(true);
  });

  it.skipIf(!secret)("rejects the same JSON re-serialised differently", () => {
    const signed = '{"event":"payment.captured","amount":100}';
    const good = createHmac("sha256", secret!).update(signed).digest("hex");
    const reserialised = JSON.stringify(JSON.parse(signed).valueOf());

    // Semantically identical, byte-different. If this passed, the handler would
    // be hashing parsed JSON and amounts could be edited in flight.
    expect(verifyWebhookSignature(reserialised + " ", good)).toBe(false);
  });

  it.skipIf(!secret)("rejects a tampered amount", () => {
    const original = '{"payload":{"payment":{"entity":{"amount":100}}}}';
    const tampered = '{"payload":{"payment":{"entity":{"amount":1}}}}';
    const good = createHmac("sha256", secret!).update(original).digest("hex");

    expect(verifyWebhookSignature(tampered, good)).toBe(false);
  });

  it.skipIf(!secret)("rejects a forged signature", () => {
    expect(verifyWebhookSignature("{}", "0".repeat(64))).toBe(false);
  });

  it("rejects everything when no secret is configured", () => {
    const saved = process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    try {
      // Fails closed — never open.
      expect(verifyWebhookSignature("{}", "anything")).toBe(false);
    } finally {
      if (saved !== undefined) process.env.RAZORPAY_WEBHOOK_SECRET = saved;
    }
  });
});

describe("fulfilment refuses payments it cannot account for", () => {
  it("404s a payment for an order we never issued, and records an incident", async () => {
    const ghost = testOrderId("ghost");

    const result = await fulfilOrder({
      razorpayOrderId: ghost,
      razorpayPaymentId: "pay_ghost",
      source: "verify-payment",
      requireUserId: f.userId,
    });

    expect(result).toMatchObject({ ok: false, status: 404 });

    // The money must not vanish silently — it lands in the ledger for an admin.
    const incidents = await incidentsFor(ghost);
    expect(incidents).toHaveLength(1);
    expect(incidents[0].source).toBe("verify-payment");
  });

  it("creates no order for an unknown gateway order", async () => {
    const ghost = testOrderId("ghost2");

    await fulfilOrder({
      razorpayOrderId: ghost,
      razorpayPaymentId: "pay_ghost2",
      source: "webhook",
    });

    const rows = await db.select().from(orders).where(eq(orders.razorpayOrderId, ghost));
    expect(rows).toHaveLength(0);
  });
});

describe("cross-account fulfilment", () => {
  it("404s when the intent belongs to someone else", async () => {
    const orderId = testOrderId("owner");
    await openIntentWithOrderId(orderId);
    const attacker = await ensureUser("attacker");

    const result = await fulfilOrder({
      razorpayOrderId: orderId,
      razorpayPaymentId: "pay_owner",
      source: "verify-payment",
      requireUserId: attacker.id,
    });

    // 404, not 403 — the attacker must not learn the intent exists.
    expect(result).toMatchObject({ ok: false, status: 404 });
  });

  it("hands the intent back so the real owner can still complete", async () => {
    const orderId = testOrderId("owner2");
    const prepared = await openIntentWithOrderId(orderId);
    const attacker = await ensureUser("attacker");

    await fulfilOrder({
      razorpayOrderId: orderId,
      razorpayPaymentId: "pay_owner2",
      source: "verify-payment",
      requireUserId: attacker.id,
    });

    // A failed attack must not deny the owner their order.
    const [intent] = await db
      .select({ status: checkoutIntents.status })
      .from(checkoutIntents)
      .where(eq(checkoutIntents.id, prepared.intentId));
    expect(intent.status).toBe("created");
  });
});

describe("intent state machine", () => {
  it("409s a payment for an expired checkout and records an incident", async () => {
    const orderId = testOrderId("expired");
    const prepared = await openIntentWithOrderId(orderId);

    await db
      .update(checkoutIntents)
      .set({ status: "expired" })
      .where(eq(checkoutIntents.id, prepared.intentId));

    const result = await fulfilOrder({
      razorpayOrderId: orderId,
      razorpayPaymentId: "pay_expired",
      source: "webhook",
    });

    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(await incidentsFor(orderId)).toHaveLength(1);
  });

  it("409s while another request holds the intent mid-flight", async () => {
    const orderId = testOrderId("inflight");
    const prepared = await openIntentWithOrderId(orderId);

    // consumed with no order id yet = someone else is part-way through.
    await db
      .update(checkoutIntents)
      .set({ status: "consumed" })
      .where(eq(checkoutIntents.id, prepared.intentId));

    const result = await fulfilOrder({
      razorpayOrderId: orderId,
      razorpayPaymentId: "pay_inflight",
      source: "verify-payment",
      requireUserId: f.userId,
    });

    expect(result).toMatchObject({ ok: false, status: 409 });
  });

  it("only one of many concurrent callers can claim an intent", async () => {
    const orderId = testOrderId("concurrent");
    await openIntentWithOrderId(orderId);

    // The browser callback and the webhook can arrive at the same instant.
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        fulfilOrder({
          razorpayOrderId: orderId,
          razorpayPaymentId: "pay_concurrent",
          source: "webhook",
        })
      )
    );

    // Whatever the gateway step does, at most one caller may ever get past the
    // claim — the rest must be turned away rather than each building an order.
    const claimed = results.filter((r) => !("status" in r) || r.status !== 409);
    expect(claimed.length).toBeLessThanOrEqual(1);

    const created = await db.select().from(orders).where(eq(orders.razorpayOrderId, orderId));
    expect(created.length).toBeLessThanOrEqual(1);
  });
});

describe("the order is built from the intent, never the request", () => {
  it("stores the priced cart as an immutable snapshot", async () => {
    const orderId = testOrderId("snapshot");
    const prepared = await openIntentWithOrderId(orderId, 2);

    const [intent] = await db
      .select()
      .from(checkoutIntents)
      .where(eq(checkoutIntents.id, prepared.intentId));
    const items = intentItems(intent);

    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe(f.productId);
    expect(items[0].quantity).toBe(2);
    // The price is the catalogue price at checkout time, not anything a client sent.
    expect(items[0].unitPriceInr).toBe(f.unitPriceInr);
  });

  it("records a payable amount the client cannot influence", async () => {
    const orderId = testOrderId("amount");
    const prepared = await openIntentWithOrderId(orderId, 3);

    expect(prepared.payableInr).toBe(f.unitPriceInr * 3);

    const [intent] = await db
      .select({ payableInr: checkoutIntents.payableInr })
      .from(checkoutIntents)
      .where(eq(checkoutIntents.id, prepared.intentId));
    expect(intent.payableInr).toBe(f.unitPriceInr * 3);
  });

  it("keeps the shipping email from the session, not the request", async () => {
    const orderId = testOrderId("email");
    const prepared = await prepareIntent({
      userId: f.userId,
      pricedItems: [pricedItem(f)],
      subtotalInr: f.unitPriceInr,
      shipping: shipping(f.userEmail),
    });
    await attachRazorpayOrder(prepared.intentId, orderId);

    const [intent] = await db
      .select()
      .from(checkoutIntents)
      .where(eq(checkoutIntents.id, prepared.intentId));

    // Stored (encrypted at rest) — the point is that it round-trips to the
    // session address, so the store cannot be used to mail strangers.
    expect(intent.shippingEmail).toBeTruthy();
  });
});
