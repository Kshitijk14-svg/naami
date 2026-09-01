/**
 * The webhook route.
 *
 * The only unauthenticated *mutating* endpoint in the application — no session,
 * no CSRF token — authenticated purely by an HMAC over the raw request body, and
 * able to create orders and decrement inventory. It is also the only thing that
 * recovers a payment when the customer closes their tab mid-checkout.
 *
 * Needs a running dev server; skips cleanly when there is not one.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { paymentIncidents, orders } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { BASE, serverIsUp } from "./helpers/server";
import { cleanup, testOrderId } from "./helpers/db";

const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

// Resolved at module load, not in beforeAll — `it.runIf()` is evaluated while
// the file is being collected, which happens before any hook runs.
const up = await serverIsUp();

beforeAll(async () => {
  await cleanup();
});

const sign = (body: string) => createHmac("sha256", SECRET!).update(body).digest("hex");

async function post(body: string, signature?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature !== undefined) headers["x-razorpay-signature"] = signature;

  const res = await fetch(`${BASE}/api/webhooks/razorpay`, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(15_000),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const capturedEvent = (orderId: string, amountPaise = 100) =>
  JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: `pay_${Date.now()}`,
          order_id: orderId,
          amount: amountPaise,
          currency: "INR",
          status: "captured",
        },
      },
    },
  });

describe("webhook signature", () => {
  it("skips when the dev server is not running", () => {
    if (!up) console.warn("  [skipped] start `npm run dev` for route-level coverage");
    expect(true).toBe(true);
  });

  it.runIf(up)("rejects a request with no signature header", async () => {
    const { status } = await post(capturedEvent("order_x"));
    // 401 when configured, 503 when the secret is unset — both are fail-closed.
    expect([401, 503]).toContain(status);
  });

  it.runIf(up)("rejects a forged signature", async () => {
    const { status } = await post(capturedEvent("order_x"), "0".repeat(64));
    expect([401, 503]).toContain(status);
  });

  it.runIf(up)("rejects a truncated signature", async () => {
    const { status } = await post(capturedEvent("order_x"), "abc");
    expect([401, 503]).toContain(status);
  });

  it.runIf(up)("rejects an empty signature", async () => {
    const { status } = await post(capturedEvent("order_x"), "");
    expect([401, 503]).toContain(status);
  });

  it.runIf(up && !!SECRET)("rejects a body tampered after signing", async () => {
    const original = capturedEvent("order_tamper", 100000);
    const tampered = original.replace('"amount":100000', '"amount":1');

    // If this passed, amounts could be edited in flight and the HMAC would be
    // covering re-serialised JSON rather than the bytes Razorpay signed.
    const { status } = await post(tampered, sign(original));
    expect(status).toBe(401);
  });

  it.runIf(up && !!SECRET)("rejects whitespace-only differences", async () => {
    const original = capturedEvent("order_ws");
    const { status } = await post(original + " ", sign(original));
    expect(status).toBe(401);
  });
});

describe("webhook event handling", () => {
  it.runIf(up && !!SECRET)("acks an event it does not handle", async () => {
    const body = JSON.stringify({ event: "refund.created", payload: {} });
    const { status, body: res } = await post(body, sign(body));

    // 200 on purpose: a non-200 makes Razorpay retry an event we will never act on.
    expect(status).toBe(200);
    expect(res).toMatchObject({ received: true, handled: false });
  });

  it.runIf(up && !!SECRET)("acks a handled event with no order id, creating nothing", async () => {
    const body = JSON.stringify({ event: "payment.captured", payload: {} });
    const { status, body: res } = await post(body, sign(body));

    expect(status).toBe(200);
    expect(res).toMatchObject({ handled: false });
  });

  it.runIf(up && !!SECRET)("rejects malformed JSON after verifying the signature", async () => {
    const body = "{";
    const { status } = await post(body, sign(body));

    // Signature first, parsing second — so an attacker cannot probe the parser.
    expect(status).toBe(400);
  });
});

describe("webhook fulfilment safety", () => {
  it.runIf(up && !!SECRET)("creates no order for an order we never issued", async () => {
    const ghost = testOrderId("wh");
    const body = capturedEvent(ghost);

    const { status } = await post(body, sign(body));

    // 200 so Razorpay stops retrying, but nothing is minted.
    expect(status).toBe(200);

    const created = await db.select().from(orders).where(eq(orders.razorpayOrderId, ghost));
    expect(created).toHaveLength(0);
  });

  it.runIf(up && !!SECRET)("records an incident for an orphan capture", async () => {
    const ghost = testOrderId("wh2");
    const body = capturedEvent(ghost);

    await post(body, sign(body));

    const incidents = await db
      .select()
      .from(paymentIncidents)
      .where(eq(paymentIncidents.razorpayOrderId, ghost));

    // Money captured with no order must be visible to an admin, not lost.
    expect(incidents).toHaveLength(1);
    expect(incidents[0].source).toBe("webhook");
  });

  it.runIf(up && !!SECRET)("never mints more than one order for one payment", async () => {
    const ghost = testOrderId("wh3");
    const body = capturedEvent(ghost);

    // Replay it — Razorpay retries, and the browser callback may race it.
    await Promise.all([post(body, sign(body)), post(body, sign(body)), post(body, sign(body))]);

    const dupes = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(orders)
      .where(eq(orders.razorpayOrderId, ghost));
    expect(dupes[0].n).toBeLessThanOrEqual(1);
  });
});

describe("global order integrity", () => {
  it("no two orders share a Razorpay payment id", async () => {
    const rows = await db.execute(sql`
      SELECT razorpay_payment_id, count(*) AS n
      FROM orders
      WHERE razorpay_payment_id IS NOT NULL
      GROUP BY razorpay_payment_id
      HAVING count(*) > 1
    `);
    // A duplicate means a customer was charged once and shipped twice.
    expect(rows.rows ?? rows).toHaveLength(0);
  });

  it("no two orders share a Razorpay order id", async () => {
    const rows = await db.execute(sql`
      SELECT razorpay_order_id, count(*) AS n
      FROM orders
      WHERE razorpay_order_id IS NOT NULL
      GROUP BY razorpay_order_id
      HAVING count(*) > 1
    `);
    expect(rows.rows ?? rows).toHaveLength(0);
  });

  it("no paid order disagrees with what was captured", async () => {
    const rows = await db.execute(sql`
      SELECT id FROM orders
      WHERE payment_status = 'paid'
        AND (paid_amount_inr IS NULL OR paid_amount_inr <> total_inr)
    `);
    expect(rows.rows ?? rows).toHaveLength(0);
  });
});
