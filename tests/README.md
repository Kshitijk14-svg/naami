# Automated tests

Covers the money logic — the purchase race, payment binding, webhook signatures —
because those failures are invisible to manual clicking and cost real money.

Everything else is manual, in [`../docs/testing/`](../docs/testing).

```bash
npm test          # run once
npm run test:watch
```

---

## ⚠ Local only

**These suites are destructive.** They set stock to 1, insert checkout intents,
forge HMAC signatures and create users.

`tests/helpers/setup.ts` aborts unless `DATABASE_URL` points at localhost:

```
  REFUSING TO RUN.

  DATABASE_URL points at "db.example.com", not localhost.
```

There is no flag to override that. If you need to test against a different
database, point it at a local copy.

---

## What you need

1. **A local Postgres with the schema and seed data**
   ```bash
   npm run db:migrate
   DATABASE_URL="postgres://..." npm run db:seed
   ```
   The fixtures borrow the first seeded product and its first size, so an empty
   database fails with a clear message.

2. **`.env.local` with `DATABASE_URL`** pointing at that database. The setup file
   parses it directly rather than using `@next/env`, because Next deliberately
   skips `.env.local` when `NODE_ENV=test` — which is what vitest sets.

3. **Optionally, a dev server** (`npm run dev`). Route-level tests skip cleanly
   without one and run when it is up. Override the URL with `TEST_BASE_URL`.

Some webhook cases also need `RAZORPAY_WEBHOOK_SECRET`; they skip without it.

---

## The suites

| File | Covers |
|---|---|
| `reservations.test.ts` | The purchase race, the expiry sweeper, quantity caps, database CHECK constraints |
| `payment.test.ts` | Signature verification, cross-account fulfilment, the intent state machine, snapshot integrity |
| `webhook.test.ts` | Signature forgery, raw-body tampering, unhandled events, replay, global order integrity |
| `smoke.test.ts` | Every route returns its expected status |

`helpers/setup.ts` loads env and enforces the localhost guard.
`helpers/db.ts` provides fixtures and cleanup. `helpers/server.ts` decides whether
route tests can run.

---

## Principles

**Drive the real code.** Tests call `prepareIntent`, `reserveStock`,
`releaseExpiredReservations` and `verifyWebhookSignature` directly. A test that
reimplements the logic it is testing proves nothing.

**No live gateway.** Nothing depends on Razorpay being reachable. Every branch
*before* the gateway confirmation is covered here; the confirmation itself is
manual, in `docs/testing/security/43-payment.md`.

**Serial by design.** `fileParallelism` is off and every fixture is namespaced
`vitest-`. The suites mutate shared rows — stock, intents, reservations — so they
must not interleave.

**Cleanup is idempotent.** `cleanup()` runs before and after each suite, so a run
that dies half-way does not poison the next one.

---

## Characterization tests

One test is marked `it.fails()`:

```ts
// KI-047: Number("abc") is NaN, which Postgres rejects...
it.runIf(up).fails("a non-numeric product id should 404, but 500s", ...)
```

It documents the **correct** behaviour while the defect stands, and starts failing
the moment the bug is fixed — at which point drop the `.fails` and delete the
paired "currently 500s" test. See `docs/testing/KNOWN-ISSUES.md`.

---

## Adding a test

- Namespace any row you create with the `vitest-` prefix so `cleanup()` finds it.
- Use `pinProduct(stock)` rather than inserting a product — it reuses a real
  catalogue row so foreign keys and pricing behave as they do in production.
- Assert on **observable behaviour**, not implementation details.
- If a test needs the dev server, gate it with `it.runIf(up)`.
