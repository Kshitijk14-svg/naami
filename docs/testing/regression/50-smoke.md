# 50 — Post-Deploy Smoke Test

**Run after every deploy.** Target: 15 minutes.

This is not a full regression pass — it is the shortest sequence that proves the
site is not broken in a way customers would notice within the hour. If anything
here fails, roll back rather than debugging forward.

**Area prefix:** `TC-SMOKE`

---

## 1. Infrastructure (2 min)

```bash
export BASE=https://naamiofficial.in
```

- [ ] **TC-SMOKE-001** — Processes are online
  ```bash
  pm2 status
  ```
  **Expect:** 2 × `naami` and 1 × `naami-worker`, all `online`, restart count not
  climbing.

- [ ] **TC-SMOKE-002** — Dependencies are healthy
  ```bash
  curl -s "$BASE/api/health/ready" | python -m json.tool
  ```
  **Expect:** `"status": "ok"`, `primaryDb: "ok"`, `redis: "ok"`.
  **`redis: down` means every rate limit is silently disabled** — fix before
  continuing.

- [ ] **TC-SMOKE-003** — The worker is draining jobs
  ```bash
  pm2 logs naami --lines 100 --nostream | grep 'worker run complete' | tail -2
  ```
  **Expect:** entries within the last minute. No worker means no emails at all.

- [ ] **TC-SMOKE-004** — Security headers are being served
  ```bash
  curl -sI "$BASE" | grep -icE 'strict-transport|content-security|permissions-policy'
  ```
  **Expect:** `3`.

- [ ] **TC-SMOKE-005** — No unresolved payment incidents
  ```bash
  psql "$DATABASE_URL" -P pager=off -c \
    "SELECT count(*) FROM payment_incidents WHERE resolved_at IS NULL;"
  ```
  **Expect:** `0`. Anything else is money captured with no order — investigate
  before anything else.

---

## 2. Public pages render (3 min)

- [ ] **TC-SMOKE-009** — Every key route returns the right status
  ```bash
  for p in / /collection /journal /about /cart /checkout /auth; do
    printf '%-14s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")"
  done
  ```
  **Expect:** `200` for all seven.

- [ ] **TC-SMOKE-010** — Protected routes redirect when signed out
  ```bash
  for p in /admin /profile /orders/ORD-TEST; do
    printf '%-18s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")"
  done
  ```
  **Expect:** `307` for all three.

- [ ] **TC-SMOKE-011** — A product page loads
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' "$BASE/product/1"
  ```

- [ ] **TC-SMOKE-012** — The homepage renders visually
  - **Steps:** open `/` in a browser with the Console open
  - **Expect:** brand loader completes, hero shows, carousels populate, footer
    renders. **No red console errors.**

- [ ] **TC-SMOKE-013** — The collection page shows products
  - **Expect:** a non-zero item count and a populated grid. **"0 items" means the
    product API is failing** — it fails silently, so this visual check is the only
    signal.

---

## 3. APIs respond (2 min)

- [ ] **TC-SMOKE-017** — Public APIs return data
  ```bash
  for p in /api/products /api/collections "/api/search?q=sh"; do
    printf '%-24s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")"
  done
  ```
  **Expect:** `200` for all three.

- [ ] **TC-SMOKE-018** — Products actually come back
  ```bash
  curl -s "$BASE/api/products" | head -c 200
  ```
  **Expect:** a JSON array with real products, not `[]`.

- [ ] **TC-SMOKE-019** — Protected APIs reject anonymous callers
  ```bash
  for p in /api/orders /api/wishlist /api/admin/products; do
    printf '%-22s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")"
  done
  ```
  **Expect:** `401` for all three.

- [ ] **TC-SMOKE-020** — Checkout fails closed if Razorpay is misconfigured
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/checkout/create-order" \
    -H 'content-type: application/json' -d '{}'
  ```
  **Expect:** `401` (auth checked first). A **503** from an authenticated call means
  the Razorpay keys are missing — **checkout is down**.

- [ ] **TC-SMOKE-021** — The webhook is reachable and verifying
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/webhooks/razorpay" \
    -H 'x-razorpay-signature: bogus' -d '{}'
  ```
  **Expect:** **401**. A `503` means the secret is unset; a `404` means nginx is not
  routing it.

---

## 4. Auth works (3 min)

- [ ] **TC-SMOKE-025** — Sign-in succeeds
  - **Steps:** sign in with the test customer account
  - **Expect:** redirected, and the navbar shows the profile avatar.

- [ ] **TC-SMOKE-026** — The session is recognised
  ```bash
  curl -s "$BASE/api/auth/me" -H "cookie: naami_session=$SESSION_CUSTOMER"
  ```
  **Expect:** `{"authenticated":true,…}` with the right role.

- [ ] **TC-SMOKE-027** — An OTP email arrives
  - **Steps:** request a password-reset code for the test account
  - **Expect:** it arrives within a minute. **This is the only auth path for new
    users** — if Gmail is broken, nobody can sign up.

- [ ] **TC-SMOKE-028** — Admin access works
  - **Steps:** sign in as the admin account and open `/admin`
  - **Expect:** the dashboard loads with all eight tiles.

- [ ] **TC-SMOKE-029** — Sign-out works

---

## 5. The purchase path (4 min)

The most important section. Requires the ₹1 test product from
[`../00-setup.md`](../00-setup.md).

- [ ] **TC-SMOKE-033** — Add to cart works
  - **Steps:** publish the ₹1 test product, open it, select the size, add to cart
  - **Expect:** the green "ADDED TO WARDROBE ✓" and the navbar badge increments.

- [ ] **TC-SMOKE-034** — The cart shows the item and the availability check runs
  - **Expect:** the line renders and `POST /api/cart/availability` returns 200 in
    the Network tab.

- [ ] **TC-SMOKE-035** — Checkout loads and the form is usable
  - **Steps:** go to `/checkout` and fill in the fields
  - ⚠ **KNOWN** KI-008 — focus is lost after each character. Work around it; you are
    testing the deploy, not this bug.

- [ ] **TC-SMOKE-036** — The Razorpay popup opens
  - **Expect:** correct amount, "NAAMI Atelier" branding.

- [ ] **TC-SMOKE-037** — **A real ₹1 payment completes**
  - **Expect:** redirected to `/orders/{id}` showing the confirmation.

- [ ] **TC-SMOKE-038** — The order is correct in the database
  ```bash
  psql "$DATABASE_URL" -P pager=off -c \
    "SELECT id, total_inr, paid_amount_inr, payment_status, status
     FROM orders ORDER BY created_at DESC LIMIT 1;"
  ```
  **Expect:** `payment_status = 'paid'` and `paid_amount_inr = total_inr = 1`.

- [ ] **TC-SMOKE-039** — Stock decremented exactly once

- [ ] **TC-SMOKE-040** — The confirmation email arrives

- [ ] **TC-SMOKE-041** — The order appears in `/admin/orders`

- [ ] **TC-SMOKE-042** — Cancelling restores stock
  - **Steps:** cancel the test order in admin
  - **Expect:** stock returns to its previous value.

- [ ] **TC-SMOKE-043** — Refund and clean up
  - **Steps:** refund the ₹1 in the Razorpay dashboard; unpublish the test product.

---

## 6. Final checks (1 min)

- [ ] **TC-SMOKE-047** — No new payment incidents from this run
  ```bash
  psql "$DATABASE_URL" -P pager=off -c \
    "SELECT count(*) FROM payment_incidents WHERE resolved_at IS NULL;"
  ```
  **Expect:** still `0`.

- [ ] **TC-SMOKE-048** — No stuck checkout intents
  ```bash
  psql "$DATABASE_URL" -P pager=off -c \
    "SELECT count(*) FROM checkout_intents
     WHERE status = 'consumed' AND order_id IS NULL
       AND created_at < now() - interval '10 minutes';"
  ```
  **Expect:** `0`.

- [ ] **TC-SMOKE-049** — No orphaned stock holds
  ```bash
  psql "$DATABASE_URL" -P pager=off -c \
    "SELECT count(*) FROM stock_reservations
     WHERE released_at IS NULL AND expires_at < now();"
  ```
  **Expect:** `0` — or a small number that clears within 30 seconds as the sweeper
  runs. A growing number means the worker is not running.

- [ ] **TC-SMOKE-050** — No error spike in the logs
  ```bash
  pm2 logs naami --lines 200 --nostream | grep -i '"level":"error"' | tail -10
  ```
  **Expect:** nothing new since the deploy.

---

## If something fails

1. **Stop.** Do not continue the checklist.
2. Capture the failing output.
3. For anything in section 5, **roll back immediately** — a broken purchase path
   costs money every minute it is live.
4. Rollback is in the deploy runbook: restore the pre-deploy database dump from
   `/backups`, check out the previous commit, rebuild, `pm2 reload`, and restore the
   nginx config from its `.bak` file.

---

## Daily operations check

Separate from deploys — worth running each morning:

```bash
psql "$DATABASE_URL" -P pager=off <<'SQL'
\echo '--- unresolved payment incidents (must be 0) ---'
SELECT count(*) FROM payment_incidents WHERE resolved_at IS NULL;
\echo '--- orders paid but amount mismatched (must be 0) ---'
SELECT count(*) FROM orders
WHERE payment_status = 'paid' AND (paid_amount_inr IS NULL OR paid_amount_inr <> total_inr);
\echo '--- stuck intents (must be 0) ---'
SELECT count(*) FROM checkout_intents
WHERE status = 'consumed' AND order_id IS NULL AND created_at < now() - interval '1 hour';
\echo '--- orphaned holds (should self-clear) ---'
SELECT count(*) FROM stock_reservations WHERE released_at IS NULL AND expires_at < now();
SQL
```

```bash
ls -lh /backups/ | tail -3          # last night's dump exists
curl -s "$BASE/api/health/ready"    # redis still ok
```
