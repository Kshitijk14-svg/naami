# 31 — Error States & Silent Failures

The application has an unusually high number of `.catch(() => {})` paths that
render an empty state instead of an error. This file exists to surface all of
them — most are already logged, but the point is to confirm the behaviour and
judge how bad it looks to a real user.

Most cases here are `[LOCAL-ONLY]` because they require blocking requests or
taking dependencies down.

**Area prefix:** `TC-ERR`

---

## How to block a request

DevTools → Network → right-click the request → **Block request URL**. Or use the
Network conditions panel to go fully offline.

---

## Silent failures — customer

Every one of these shows a normal-looking page rather than an error.

- [ ] **TC-ERR-001** `[LOCAL-ONLY]` — Announcements fail → the bar simply vanishes
  - **Block:** `/api/design/announcements`
  - **Expect:** no bar, no gap, no error. Harmless but note it.

- [ ] **TC-ERR-002** `[LOCAL-ONLY]` — Footer doodle fails → plain watermark
  - **Block:** `/api/design/footer-doodle`

- [ ] **TC-ERR-003** `[LOCAL-ONLY]` — **Collection products fail → "0 items"**
  - **Block:** `/api/products` · **Load:** `/collection`
  - **Expect:** an empty grid reading "0 items" with **no error and no retry**. A
    customer concludes the shop is empty. ⚠ **KNOWN** KI-022 — record how bad it
    looks.

- [ ] **TC-ERR-004** `[LOCAL-ONLY]` — Collection tabs fail → only the default tab
  - **Block:** `/api/collections`

- [ ] **TC-ERR-005** `[LOCAL-ONLY]` — **Profile orders fail → "No orders yet."**
  - **Block:** `/api/orders` · **Open:** `/profile` → Order History
  - **Expect:** the empty state. A customer with 20 orders is told they have none.
    ⚠ **KNOWN** KI-023.

- [ ] **TC-ERR-006** `[LOCAL-ONLY]` — Profile wishlist fails → "Your wishlist is empty."

- [ ] **TC-ERR-007** `[LOCAL-ONLY]` — **Order items fail → a total with no items**
  - **Block:** `/api/orders/*/items` · **Open:** an order
  - **Expect:** header, status and Total render; the item list is empty with no
    message. ⚠ **KNOWN** KI-026.

- [ ] **TC-ERR-008** `[LOCAL-ONLY]` — Cart availability fails → everything looks in stock
  - **Block:** `/api/cart/availability`
  - **Expect:** fails open, checkout stays enabled. ⚠ **KNOWN** KI-031.

- [ ] **TC-ERR-009** `[LOCAL-ONLY]` — Search fails → possibly a stale dropdown
  - **See** `customer/01-global-chrome.md` TC-CHR-041.

- [ ] **TC-ERR-010** `[LOCAL-ONLY]` — Wishlist toggle fails → heart stays filled
  - ⚠ **KNOWN** KI-024.

- [ ] **TC-ERR-011** `[LOCAL-ONLY]` — Product fetch fails → "Product not found."
  - **Expect:** indistinguishable from a real 404. ⚠ **KNOWN** KI-032.

- [ ] **TC-ERR-012** `[LOCAL-ONLY]` — Checkout coupon fetch fails → discount silently 0
  - ⚠ **KNOWN** KI-030.

---

## Silent failures — admin

- [ ] **TC-ERR-016** `[LOCAL-ONLY]` — **Design manager load fails → empty fields, no error**
  - **Block:** `/api/admin/design` · **Open:** `/admin/design`
  - **Expect:** the page renders with blank inputs. **Saving now would wipe every
    setting** — confirm whether that is true and record as S2 if so.

- [ ] **TC-ERR-017** `[LOCAL-ONLY]` — Product delete fails → row restored + message
  - **Expect:** this one is handled correctly. Confirm.

- [ ] **TC-ERR-018** `[LOCAL-ONLY]` — Category delete fails → row silently remains
  - **Expect:** no message. Contrast with TC-ERR-017.

- [ ] **TC-ERR-019** `[LOCAL-ONLY]` — Collection and coupon deletes behave the same

- [ ] **TC-ERR-020** `[LOCAL-ONLY]` — Blog delete fails → silent
- [ ] **TC-ERR-021** `[LOCAL-ONLY]` — Product picker fetch fails → an empty dropdown, no error
- [ ] **TC-ERR-022** `[LOCAL-ONLY]` — Analytics fetch fails → "Failed to load analytics"
  - **Expect:** handled. Confirm.
- [ ] **TC-ERR-023** `[LOCAL-ONLY]` — Dashboard session fetch fails → an empty tile grid

---

## Malformed responses

- [ ] **TC-ERR-027** `[LOCAL-ONLY]` — Malformed JSON to an admin route gives a bare 500
  ```bash
  curl -s -w '\n%{http_code}\n' -X POST "$BASE/api/admin/products" \
    -H "cookie: naami_session=$SESSION_ADMIN" \
    -H 'content-type: application/json' -d '{'
  ```
  **Expect:** **500** with no JSON body. ⚠ **KNOWN** KI-033. Repeat for
  `admin/collections`, `admin/categories`, `admin/blog`, `admin/coupons`,
  `admin/design`, and `POST /api/wishlist`.

- [ ] **TC-ERR-028** `[LOCAL-ONLY]` — Well-handled routes degrade gracefully
  - **Steps:** send the same `{` to `/api/cart/availability` and `/api/feedback`
  - **Expect:** `{"results":[]}` and a 400 respectively — **not** a 500. This is the
    correct pattern; contrast with TC-ERR-027.

- [ ] **TC-ERR-029** `[LOCAL-ONLY]` — A JSON `null` body crashes the design route
  ```bash
  curl -s -w '\n%{http_code}\n' -X POST "$BASE/api/admin/design" \
    -H "cookie: naami_session=$SESSION_ADMIN" \
    -H 'content-type: application/json' -d 'null'
  ```
  **Expect:** **500**. ⚠ **KNOWN** KI-034 — `typeof null === "object"` passes the
  guard.

- [ ] **TC-ERR-030** `[LOCAL-ONLY]` — A nonexistent product id in the wishlist gives a 500
  ```bash
  curl -s -w '\n%{http_code}\n' -X POST "$BASE/api/wishlist" \
    -H "cookie: naami_session=$SESSION_CUSTOMER" \
    -H 'content-type: application/json' -d '{"productId":99999999}'
  ```
  **Expect:** **500** from an uncaught foreign-key violation. ⚠ **KNOWN** KI-033.

- [ ] **TC-ERR-031** `[LOCAL-ONLY]` — A negative or float productId is accepted
  - **Steps:** send `{"productId": -1}` and `{"productId": 1.5}`
  - **Expect:** the validation only rejects falsy and `NaN`. Record the outcome.

---

## Network conditions

- [ ] **TC-ERR-035** `[LOCAL-ONLY]` — Fully offline
  - **Steps:** 1. Load the site 2. Go offline in DevTools 3. Navigate around
  - **Expect:** record what each page does. There is no offline page or service
    worker, so expect browser errors.
- [ ] **TC-ERR-036** `[PROD-SAFE]` — Slow 3G is usable
  - **Steps:** 1. Throttle 2. Complete browse → cart → checkout
  - **Expect:** skeletons and loading states appear; nothing looks broken or
    permanently empty.
- [ ] **TC-ERR-037** `[LOCAL-ONLY]` — A request that hangs
  - **Steps:** 1. Throttle to a very slow custom profile 2. Click Pay
  - **Expect:** the button stays in "Processing…". Record whether there is any
    timeout or escape.
- [ ] **TC-ERR-038** `[PROD-SAFE]` — Going offline mid-checkout
  - **Steps:** 1. Fill the checkout form 2. Go offline 3. Click Pay
  - **Expect:** **"An unexpected error occurred. Please try again."** and the form
    is preserved — confirm nothing is lost.

---

## Dependency failures

- [ ] **TC-ERR-042** `[LOCAL-ONLY]` — Redis down → rate limits silently stop working
  - **Steps:** 1. Point `UPSTASH_REDIS_REST_TOKEN` at nothing 2. Restart 3. Try 20
    failed logins
  - **Expect:** no 429 at all. **This is fail-open by design** — the important thing
    is that `/api/health/ready` reports it. Confirm it does.
- [ ] **TC-ERR-043** `[LOCAL-ONLY]` — Redis down → the site still works
  - **Expect:** caching degrades but pages render.
- [ ] **TC-ERR-044** `[LOCAL-ONLY]` — Razorpay unreachable → checkout fails closed
  - **Steps:** 1. Block `api.razorpay.com` server-side 2. Attempt a purchase
  - **Expect:** **502 "Failed to create payment order."** and **no order is
    created.** Failing closed here is correct — verify no unpaid order appears.
- [ ] **TC-ERR-045** `[LOCAL-ONLY]` — Mail server down → the OTP flow reports it
  - **Expect:** "Failed to send code. Please try again." — not a silent success.
- [ ] **TC-ERR-046** `[LOCAL-ONLY]` — Database down → `/api/health/ready` returns 503
  - **Expect:** `{"status":"unavailable", …}` with `primaryDb: "down"`.
- [ ] **TC-ERR-047** `[LOCAL-ONLY]` — `/api/health` stays 200 during a full outage
  - **Expect:** it touches no dependency — by design. Confirm your monitoring uses
    `/ready`, not this one.

---

## Console hygiene

- [ ] **TC-ERR-051** `[PROD-SAFE]` — No console errors on any customer page
  - **Steps:** visit every customer page with the Console open
  - **Expect:** no red errors. React key warnings and hydration mismatches count —
    record them.
- [ ] **TC-ERR-052** `[PROD-SAFE]` — No console errors on any admin page
- [ ] **TC-ERR-053** `[PROD-SAFE]` — No 404s for assets
  - **Steps:** Network tab → filter by status, look for 404s on images, fonts and
    scripts across the site
- [ ] **TC-ERR-054** `[PROD-SAFE]` — No mixed-content warnings on https
- [ ] **TC-ERR-055** `[PROD-SAFE]` — No unhandled promise rejections
  - **Steps:** run a full customer journey with the Console open
