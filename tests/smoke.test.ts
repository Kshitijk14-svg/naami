/**
 * Route smoke tests.
 *
 * Every route returns the status it should. Catches "the deploy broke
 * something" in seconds — a wrong status here usually means a route crashed at
 * import time or an auth guard was removed.
 *
 * Needs a running dev server; skips cleanly when there is not one.
 */
import { describe, it, expect } from "vitest";
import { BASE, serverIsUp, status, json } from "./helpers/server";

// Resolved at module load, not in beforeAll — `it.runIf()` is evaluated while
// the file is being collected, which happens before any hook runs.
const up = await serverIsUp();

describe("public pages", () => {
  it("skips when the dev server is not running", () => {
    if (!up) console.warn(`  [skipped] no server at ${BASE} — run \`npm run dev\``);
    expect(true).toBe(true);
  });

  const pages = ["/", "/collection", "/journal", "/about", "/cart", "/checkout", "/auth"];

  for (const path of pages) {
    it.runIf(up)(`${path} returns 200`, async () => {
      expect(await status(path)).toBe(200);
    });
  }

  it.runIf(up)("an unknown path 404s", async () => {
    expect(await status("/this-route-does-not-exist")).toBe(404);
  });
});

describe("protected pages redirect when signed out", () => {
  const protectedPages = ["/admin", "/admin/products", "/admin/orders", "/profile", "/orders/ORD-TEST"];

  for (const path of protectedPages) {
    it.runIf(up)(`${path} redirects`, async () => {
      const res = await fetch(`${BASE}${path}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      });
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/auth");
    });
  }
});

describe("public APIs", () => {
  it.runIf(up)("GET /api/products returns an array", async () => {
    const { status: s, body } = await json<unknown[]>("/api/products");
    expect(s).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it.runIf(up)("GET /api/collections returns an array", async () => {
    const { status: s, body } = await json<unknown[]>("/api/collections");
    expect(s).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it.runIf(up)("search below 2 characters returns empty without querying", async () => {
    const { status: s, body } = await json<unknown[]>("/api/search?q=a");
    expect(s).toBe(200);
    expect(body).toEqual([]);
  });

  it.runIf(up)("GET /api/health is 200", async () => {
    expect(await status("/api/health")).toBe(200);
  });

  it.runIf(up)("GET /api/health/ready reports dependency state", async () => {
    const { status: s, body } = await json<{ status: string; checks: Record<string, string> }>(
      "/api/health/ready"
    );
    // 200 ok/degraded, 503 only when the primary database is unreachable.
    expect([200, 503]).toContain(s);
    expect(body?.checks).toBeDefined();
  });

  it.runIf(up)("a nonexistent product 404s", async () => {
    expect(await status("/api/products/99999999")).toBe(404);
  });

  // KI-047: Number("abc") is NaN, which Postgres rejects as an integer
  // comparison, so this throws instead of falling through to the 404.
  // it.fails() keeps the suite green while the defect stands, and starts
  // failing the moment it is fixed — at which point drop the `.fails`.
  it.runIf(up).fails("a non-numeric product id should 404, but 500s", async () => {
    expect(await status("/api/products/abc")).toBe(404);
  });

  it.runIf(up)("a non-numeric product id currently 500s", async () => {
    expect(await status("/api/products/abc")).toBe(500);
  });
});

describe("APIs that must reject anonymous callers", () => {
  const guarded: Array<[string, string]> = [
    ["GET", "/api/orders"],
    ["GET", "/api/wishlist"],
    ["GET", "/api/auth/me"],
    ["GET", "/api/admin/products"],
    ["GET", "/api/admin/orders"],
    ["GET", "/api/admin/coupons"],
    ["GET", "/api/admin/analytics"],
    ["GET", "/api/admin/design"],
  ];

  for (const [method, path] of guarded) {
    it.runIf(up)(`${method} ${path} is 401`, async () => {
      expect(await status(path, { method })).toBe(401);
    });
  }

  it.runIf(up)("POST /api/checkout/create-order is 401", async () => {
    expect(
      await status("/api/checkout/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    ).toBe(401);
  });

  it.runIf(up)("POST /api/checkout/verify-payment is 401", async () => {
    expect(
      await status("/api/checkout/verify-payment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    ).toBe(401);
  });

  it.runIf(up)("POST /api/feedback is 401", async () => {
    expect(
      await status("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"rating":5}',
      })
    ).toBe(401);
  });

  it.runIf(up)("the jobs worker rejects a session-less caller", async () => {
    const s = await status("/api/internal/process-jobs", { method: "POST" });
    // 401 when configured, 503 when JOBS_WORKER_SECRET is unset.
    expect([401, 503]).toContain(s);
  });
});

describe("cart availability", () => {
  it.runIf(up)("is public and degrades gracefully on a bad body", async () => {
    const { status: s, body } = await json<{ results: unknown[] }>("/api/cart/availability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    // Handled, not a 500 — contrast with the admin routes.
    expect(s).toBe(200);
    expect(body?.results).toEqual([]);
  });

  it.runIf(up)("caps the number of lines it will process", async () => {
    const lines = Array.from({ length: 500 }, () => ({ productId: 1, size: "S" }));
    const { status: s, body } = await json<{ results: unknown[] }>("/api/cart/availability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lines }),
    });
    expect(s).toBe(200);
    expect(body?.results.length).toBeLessThanOrEqual(100);
  });

  it.runIf(up)("does not leak stock for an unpublished product", async () => {
    // 99999999 stands in for any id that is not publicly visible.
    const { body } = await json<{ results: Array<{ stock: number; available: boolean }> }>(
      "/api/cart/availability",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: [{ productId: 99999999, size: "S" }] }),
      }
    );
    expect(body?.results[0]).toMatchObject({ stock: 0, available: false });
  });
});

describe("webhook route", () => {
  it.runIf(up)("fails closed on a bad signature", async () => {
    const s = await status("/api/webhooks/razorpay", {
      method: "POST",
      headers: { "content-type": "application/json", "x-razorpay-signature": "bogus" },
      body: "{}",
    });
    // 401 when the secret is set, 503 when it is not. A 404 means nginx or the
    // route is missing entirely.
    expect([401, 503]).toContain(s);
  });
});
