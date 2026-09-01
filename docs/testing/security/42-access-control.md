# 42 — Access Control & IDOR

The application's stated policy: **an ownership mismatch returns 404, never 403**,
so the existence of another user's resource is never confirmed. Verify that holds
everywhere.

**Area prefix:** `TC-SEC-AC`

---

## Setup

You need two customer accounts and an order belonging to each.

```bash
export ORDER_A='ORD-XXXXXXXX'   # owned by customer A
export ORDER_B='ORD-YYYYYYYY'   # owned by customer B
```

---

## Order IDOR — the core cases

- [ ] **TC-SEC-AC-001** `[PROD-SAFE]` — Customer A cannot read customer B's order
  ```bash
  curl -s -w '\n%{http_code}\n' "$BASE/api/orders/$ORDER_B" \
    -H "cookie: naami_session=$SESSION_CUSTOMER"
  ```
  **Expect:** **404** `{"error":"Not found"}` — **not** 403, and no order data.
  **Any leaked field is S1.**

- [ ] **TC-SEC-AC-002** `[PROD-SAFE]` — The same for order items
  ```bash
  curl -s -w '\n%{http_code}\n' "$BASE/api/orders/$ORDER_B/items" \
    -H "cookie: naami_session=$SESSION_CUSTOMER"
  ```
  **Expect:** **404**.

- [ ] **TC-SEC-AC-003** `[PROD-SAFE]` — The same for the invoice PDF
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/orders/$ORDER_B/invoice" \
    -H "cookie: naami_session=$SESSION_CUSTOMER"
  ```
  **Expect:** **404**. **A downloadable PDF here is S1** — invoices carry the full
  shipping address and phone number.

- [ ] **TC-SEC-AC-004** `[PROD-SAFE]` — A nonexistent order returns an identical 404
  - **Steps:** request `/api/orders/ORD-DOESNOTEXIST`
  - **Expect:** byte-identical body and status to TC-SEC-AC-001. Compare them
    directly — any difference is an existence oracle.

- [ ] **TC-SEC-AC-005** `[LOCAL-ONLY]` — Response timing does not distinguish the two
  - **Steps:** 1. Time 30 requests for B's order 2. Time 30 for a nonexistent id
    3. Compare medians
  - **Expect:** the ownership-mismatch path does one extra database lookup, so a
    small delta is likely. Record it — **S3** only if consistently measurable.

- [ ] **TC-SEC-AC-006** `[PROD-SAFE]` — `/api/orders` only ever returns your own
  - **Steps:** call it as A and as B and compare
  - **Expect:** disjoint sets. The list is derived from the session, never from a
    client-supplied id.

- [ ] **TC-SEC-AC-007** `[PROD-SAFE]` — Order ids are not enumerable
  - **Steps:** 1. Look at three of your order ids 2. Try to guess a fourth
  - **Expect:** they are random, not sequential. Any sequential pattern is **S2**.

- [ ] **TC-SEC-AC-008** `[PROD-SAFE]` — The order page 404s in the browser too
  - **Steps:** as customer A, open `/orders/{ORDER_B}`
  - **Expect:** "Order not found."

---

## Staff privilege scope

⚠ **KNOWN** KI-006 — staff have far more reach than the sidebar suggests.

- [ ] **TC-SEC-AC-012** `[PROD-SAFE]` — **Staff can read any customer's order**
  ```bash
  curl -s "$BASE/api/orders/$ORDER_B" -H "cookie: naami_session=$SESSION_STAFF" | head -c 400
  ```
  **Expect:** it succeeds — the ownership check only guards `role === "customer"`.
  Record whether that is intended for your fulfilment workflow.

- [ ] **TC-SEC-AC-013** `[PROD-SAFE]` — Staff can download any invoice PDF
  - **Expect:** succeeds. Note the PDF contains full PII.

- [ ] **TC-SEC-AC-014** `[PROD-SAFE]` — **`?q=%` returns every order with decrypted PII**
  ```bash
  curl -s "$BASE/api/admin/orders?q=%25" \
    -H "cookie: naami_session=$SESSION_STAFF" | head -c 600
  ```
  **Expect:** every order in the system, unpaginated, including `shippingPhone` and
  `shippingAddress` in clear text. ⚠ **KNOWN** KI-006. Record the row count.

- [ ] **TC-SEC-AC-015** `[PROD-SAFE]` — `?q=_` behaves similarly
  - **Expect:** `_` is the single-character SQL wildcard and is also unescaped.

- [ ] **TC-SEC-AC-016** `[PROD-SAFE]` — Staff cannot reach any non-order admin API
  ```bash
  for p in products categories collections coupons blog design feedback analytics upload; do
    printf '%-12s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' \
      "$BASE/api/admin/$p" -H "cookie: naami_session=$SESSION_STAFF")"
  done
  ```
  **Expect:** **403** for every one. Any 200 is **S2**.

- [ ] **TC-SEC-AC-017** `[PROD-SAFE]` — Staff cannot mutate products
  - **Steps:** POST, PUT and DELETE against `/api/admin/products`
  - **Expect:** **403** each time, and no data changes.

- [ ] **TC-SEC-AC-018** `[PROD-SAFE]` — Staff cannot change design settings
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/admin/design" \
    -H "cookie: naami_session=$SESSION_STAFF" \
    -H 'content-type: application/json' -d '{"hero_title_1":"HACKED"}'
  ```
  **Expect:** **403**, and the homepage is unchanged.

---

## Customer against admin

- [ ] **TC-SEC-AC-022** `[PROD-SAFE]` — A customer gets 403 from every admin route
  ```bash
  for p in orders products categories collections coupons blog design feedback analytics; do
    printf '%-12s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' \
      "$BASE/api/admin/$p" -H "cookie: naami_session=$SESSION_CUSTOMER")"
  done
  ```
  **Expect:** **403** across the board, including `orders`.

- [ ] **TC-SEC-AC-023** `[PROD-SAFE]` — A customer cannot change an order's status
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' -X PUT "$BASE/api/admin/orders/$ORDER_A" \
    -H "cookie: naami_session=$SESSION_CUSTOMER" \
    -H 'content-type: application/json' -d '{"status":"delivered"}'
  ```
  **Expect:** **403**, even on **their own** order.

- [ ] **TC-SEC-AC-024** `[PROD-SAFE]` — A customer cannot trigger the jobs worker
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/internal/process-jobs" \
    -H "cookie: naami_session=$SESSION_CUSTOMER"
  ```
  **Expect:** **401** — it takes a shared secret, not a session.

---

## Other ownership boundaries

- [ ] **TC-SEC-AC-028** `[PROD-SAFE]` — Wishlist deletes are scoped to the caller
  - **Steps:** as A, `DELETE /api/wishlist/{a product B has wishlisted}`
  - **Expect:** **200** but B's wishlist is unchanged — the delete is scoped by
    userId. Verify B's list directly.

- [ ] **TC-SEC-AC-029** `[PROD-SAFE]` — Feedback cannot be attached to another user's order
  - **See** `customer/10-order-detail.md` TC-ORD-076.
  - **Expect:** **404** `{"error":"Order not found."}`

- [ ] **TC-SEC-AC-030** `[PROD-SAFE]` — Payment verification refuses another user's intent
  - **See** `43-payment.md` TC-SEC-PAY-006.

---

## Unpublished data exposure

- [ ] **TC-SEC-AC-034** `[PROD-SAFE]` — An unpublished product 404s publicly
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/products/$UNPUBLISHED_ID"
  ```
  **Expect:** **404**.

- [ ] **TC-SEC-AC-035** `[PROD-SAFE]` — **Cart availability does not leak unpublished stock**
  ```bash
  curl -s -X POST "$BASE/api/cart/availability" \
    -H 'content-type: application/json' \
    -d "{\"lines\":[{\"productId\":$UNPUBLISHED_ID,\"size\":\"M\"}]}"
  ```
  **Expect:** `{"stock":0,"available":false}` — **not** the real stock number. This
  was fixed in the hardening pass; confirm it holds.

- [ ] **TC-SEC-AC-036** `[PROD-SAFE]` — Unpublished products are absent from `/api/products`
- [ ] **TC-SEC-AC-037** `[PROD-SAFE]` — Unpublished products are absent from search
- [ ] **TC-SEC-AC-038** `[PROD-SAFE]` — An unpublished collection 404s
- [ ] **TC-SEC-AC-039** `[PROD-SAFE]` — **A collection may still leak unpublished product ids**
  ```bash
  curl -s "$BASE/api/collections/1"
  ```
  **Expect:** check whether `productIds` includes ids that 404 at
  `/api/products/{id}`. If so it leaks the existence and count of unreleased
  products — **S3**.
- [ ] **TC-SEC-AC-040** `[PROD-SAFE]` — A draft journal post 404s and leaks no title
  - **Expect:** the page 404s and the metadata title is the generic
    "Journal — NAAMI Atelier", not the draft's title.

---

## Route protection

- [ ] **TC-SEC-AC-044** `[PROD-SAFE]` — Protected pages redirect when signed out
  ```bash
  for p in /admin /admin/products /profile /orders/ORD-TEST; do
    printf '%-22s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")"
  done
  ```
  **Expect:** **307** for all four.

- [ ] **TC-SEC-AC-045** `[PROD-SAFE]` — **`/checkout` and `/cart` are NOT protected**
  - **Expect:** both return 200 signed out. Deliberate, but confirm — the
    consequence is the bare "Unauthorized" at the Pay button (KI-010).

- [ ] **TC-SEC-AC-046** `[PROD-SAFE]` — `/api/**` is not covered by the edge proxy
  - **Expect:** confirm every API route enforces its own auth — that is what the
    per-route cases above verify. This is a design note, not a defect.

- [ ] **TC-SEC-AC-047** `[PROD-SAFE]` — Path tricks do not bypass the proxy
  - **Steps:** try `/admin/`, `/Admin`, `/admin/../admin`, `//admin`,
    `/admin%2fproducts`
  - **Expect:** none reach the admin panel unauthenticated.

---

## Direct object references elsewhere

- [ ] **TC-SEC-AC-051** `[PROD-SAFE]` — Coupon redemptions are admin-only
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/admin/coupons/1/redemptions" \
    -H "cookie: naami_session=$SESSION_CUSTOMER"
  ```
  **Expect:** **403** — the response contains customer emails and IP addresses.
- [ ] **TC-SEC-AC-052** `[PROD-SAFE]` — Order status history is not publicly readable
- [ ] **TC-SEC-AC-053** `[PROD-SAFE]` — Admin notes never reach the customer API
  - **See** `admin/24-orders.md` TC-ADM-ORD-071.
- [ ] **TC-SEC-AC-054** `[PROD-SAFE]` — The customer order response omits `adminNotes`
  ```bash
  curl -s "$BASE/api/orders/$ORDER_A" \
    -H "cookie: naami_session=$SESSION_CUSTOMER" | grep -i adminnotes
  ```
  **Expect:** no match.
