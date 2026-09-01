# 43 — Payment Security

The original flaw: `create-order` persisted nothing, and `verify-payment` re-priced
a **second, client-supplied** cart, checking only that the signature triple was
valid. Nothing linked the money captured to the order created.

> Buy the cheapest item, pay ₹499, capture the signature triple the widget hands
> to `handler`, then POST that same valid triple with a ₹50,000 cart. The signature
> validates, the server honestly re-prices to ₹50,000, writes the order,
> decrements real inventory and emails a confirmation.
> **₹499 collected, ₹50,000 shipped.**

That is now closed by a server-side checkout intent. **These cases verify the fix
still holds.**

**Area prefix:** `TC-SEC-PAY`

---

## How verification works now

1. The HMAC over `order_id|payment_id` is checked with `RAZORPAY_KEY_SECRET`.
2. The intent is loaded **by `razorpayOrderId`** and its owner is asserted.
3. It is claimed atomically — `UPDATE … WHERE status='created'`.
4. Razorpay's API is called to confirm the payment really was captured, for the
   right order, in INR, at exactly the intent's amount.
5. The order is built **from the intent**, never from the request body.

The request body accepts **only** `razorpayOrderId`, `razorpayPaymentId` and
`razorpaySignature`. Anything else is ignored.

---

## The core exploit — must fail

- [ ] **TC-SEC-PAY-001** `[LOCAL-ONLY]` — **A valid triple with a tampered cart buys nothing**
  - **Steps:**
    1. Complete a real ₹1 checkout locally with test keys, capturing the triple
       from DevTools before the redirect
    2. Replay it with an expensive cart bolted on:
       ```bash
       curl -s -w '\n%{http_code}\n' -X POST "$BASE/api/checkout/verify-payment" \
         -H "cookie: naami_session=$SESSION_CUSTOMER" \
         -H 'content-type: application/json' \
         -d '{"razorpayOrderId":"order_XXX","razorpayPaymentId":"pay_XXX",
              "razorpaySignature":"VALID_SIG",
              "items":[{"productId":1,"quantity":100,"size":"M"}],
              "shipping":{"name":"Attacker"}}'
       ```
  - **Expect:** the order, **if created at all**, matches the intent — one unit at
    ₹1. The `items` array is never read.
  - **Verify:**
    ```sql
    SELECT id, total_inr, paid_amount_inr FROM orders ORDER BY created_at DESC LIMIT 1;
    ```
    `total_inr` must equal `paid_amount_inr`. **Any order above the paid amount is
    S1 — stop immediately.**
  - **Also verify:** stock did not drop by 100.

- [ ] **TC-SEC-PAY-002** `[PROD-SAFE]` — A triple for an order we never issued is refused
  ```bash
  curl -s -w '\n%{http_code}\n' -X POST "$BASE/api/checkout/verify-payment" \
    -H "cookie: naami_session=$SESSION_CUSTOMER" \
    -H 'content-type: application/json' \
    -d '{"razorpayOrderId":"order_FAKE123","razorpayPaymentId":"pay_FAKE",
         "razorpaySignature":"0000000000000000000000000000000000000000000000000000000000000000"}'
  ```
  **Expect:** **400** "Payment signature verification failed." — it never reaches
  the intent lookup.

- [ ] **TC-SEC-PAY-003** `[LOCAL-ONLY]` — A **validly signed** triple for an unknown order 404s
  - **Steps:** compute a genuine HMAC over `order_UNKNOWN|pay_UNKNOWN` with the
    local key secret, then POST it
  - **Expect:** **404** `{"error":"Unknown checkout session."}` and a row in
    `payment_incidents` with reason "Payment received for a checkout intent this
    server never created."
  ```sql
  SELECT razorpay_order_id, reason, source FROM payment_incidents ORDER BY id DESC LIMIT 1;
  ```

- [ ] **TC-SEC-PAY-004** `[PROD-SAFE]` — A forged signature is rejected
  - **Steps:** take a real triple and change one character of the signature
  - **Expect:** **400** "Payment signature verification failed."

- [ ] **TC-SEC-PAY-005** `[PROD-SAFE]` — An empty signature is rejected
  - **Expect:** **400** "Invalid payment payload."

---

## Cross-account and replay

- [ ] **TC-SEC-PAY-006** `[LOCAL-ONLY]` — **Another account cannot fulfil your intent**
  - **Steps:** 1. As customer A, create a checkout intent (start a checkout without
    paying) 2. Capture a valid triple for it 3. Replay it with **customer B's**
    session
  - **Expect:** **404** `{"error":"Unknown checkout session."}` — a 404, not a 403,
    so B learns nothing.
  - **Then verify A's intent was handed back:**
    ```sql
    SELECT id, status FROM checkout_intents ORDER BY id DESC LIMIT 1;
    ```
    **Expect:** still `created`, so A can still complete their own purchase. **If it
    is stuck at `consumed`, B has denied A their order — S2.**

- [ ] **TC-SEC-PAY-007** `[PROD-DATA]` — Replaying your own successful triple is idempotent
  - **Steps:** 1. Complete a ₹1 purchase 2. Replay the same triple
  - **Expect:** **200** with `idempotent: true` and the **same** order id.
  - **Verify exactly one order exists:**
    ```sql
    SELECT razorpay_payment_id, count(*) FROM orders
    WHERE razorpay_payment_id IS NOT NULL
    GROUP BY razorpay_payment_id HAVING count(*) > 1;
    ```
    Must be empty. **A duplicate order is S1** — the customer is charged once and
    shipped twice.

- [ ] **TC-SEC-PAY-008** `[PROD-DATA]` — Replaying does not decrement stock twice
  - **Steps:** 1. Note stock 2. Purchase 3. Replay the triple 4. Re-check stock
  - **Expect:** decremented exactly once.

- [ ] **TC-SEC-PAY-009** `[PROD-SAFE]` — Verification requires a session
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/checkout/verify-payment" \
    -H 'content-type: application/json' -d '{}'
  ```
  **Expect:** **401**.

---

## Amount integrity

- [ ] **TC-SEC-PAY-013** `[LOCAL-ONLY]` — A payment for the wrong amount is refused
  - **Steps:** 1. Create a Razorpay test order for ₹1 **directly via their API**
    2. Pay it 3. Create a separate intent in your app for ₹5,000 4. Try to verify
    the ₹1 payment against the ₹5,000 intent
  - **Expect:** rejected. The internal reason will be an amount mismatch; the
    customer sees **400 "Payment could not be verified."**
  - **Verify:** the intent is marked `failed` and a `payment_incidents` row exists.

- [ ] **TC-SEC-PAY-014** `[PROD-SAFE]` — Prices are never taken from the client
  - **Steps:** send a `create-order` body with a price field:
    ```bash
    curl -s -X POST "$BASE/api/checkout/create-order" \
      -H "cookie: naami_session=$SESSION_CUSTOMER" \
      -H 'content-type: application/json' \
      -d '{"items":[{"productId":1,"quantity":1,"size":"M","priceInr":1,"unitPriceInr":1}]}'
    ```
  - **Expect:** the returned `payableInr` is the **real catalogue price**, not 1.

- [ ] **TC-SEC-PAY-015** `[PROD-SAFE]` — A negative quantity is rejected
  - **Steps:** `"quantity": -5`
  - **Expect:** **400** "Invalid cart item."

- [ ] **TC-SEC-PAY-016** `[PROD-SAFE]` — A fractional quantity is rejected
  - **Steps:** `"quantity": 1.5`

- [ ] **TC-SEC-PAY-017** `[PROD-SAFE]` — A huge quantity is capped
  - **Steps:** `"quantity": 9999`
  - **Expect:** **400** "You can order at most 20 of any one item…"

- [ ] **TC-SEC-PAY-018** `[PROD-SAFE]` — An unpublished product cannot be bought
  - **Expect:** **400** "One or more items are no longer available."

- [ ] **TC-SEC-PAY-019** `[PROD-SAFE]` — The shipping email cannot be spoofed
  - **Steps:** send `"shippingEmail":"stranger@example.com"` in `create-order`
  - **Expect:** the abandoned-cart record and confirmation use **your session
    email**. This closed a mail-relay abuse — confirm it holds.
  ```sql
  SELECT email FROM abandoned_carts ORDER BY id DESC LIMIT 1;
  ```

---

## The purchase race

- [ ] **TC-SEC-PAY-023** `[LOCAL-ONLY]` — **Two buyers cannot both take the last unit**
  - **Steps:** 1. Set a size's stock to 1 2. From two sessions, fire
    `create-order` for that size simultaneously
  - **Expect:** one **200** and one **409** — and the 409 arrives **before either
    buyer reaches a payment screen.** Nobody is charged for stock that does not
    exist.
  - **Verify exactly one hold:**
    ```sql
    SELECT count(*) FROM stock_reservations
    WHERE product_id = X AND released_at IS NULL;
    ```
    Must be 1.
  - This is fully covered by the automated suite — see `tests/reservations.test.ts`.

- [ ] **TC-SEC-PAY-024** `[LOCAL-ONLY]` — Raw stock is not decremented before payment
  - **Expect:** after taking a hold, `product_sizes.stock` is unchanged. Only the
    reservation exists.

- [ ] **TC-SEC-PAY-025** `[LOCAL-ONLY]` — An abandoned checkout releases its hold
  - **Steps:** 1. Start a checkout, do not pay 2. Wait 15 minutes 3. Check
  - **Expect:** the reservation is released and the intent is `expired`. The unit is
    buyable again.

- [ ] **TC-SEC-PAY-026** `[LOCAL-ONLY]` — A held unit cannot be double-sold
  - **Steps:** 1. Session A holds the last unit 2. Session B tries to check out
  - **Expect:** B gets **409** at create-order.

---

## Coupon abuse

- [ ] **TC-SEC-PAY-030** `[PROD-DATA]` — A per-user limit cannot be exceeded
- [ ] **TC-SEC-PAY-031** `[LOCAL-ONLY]` — A coupon cannot be used twice concurrently
  - **Steps:** 1. `TESTONCE`, per-user limit 1 2. Fire two `create-order` calls
    simultaneously from the same account
  - **Expect:** one succeeds, one gets **400** — the coupon is held under a row lock
    in the same transaction as the stock.
- [ ] **TC-SEC-PAY-032** `[PROD-DATA]` — A total usage limit is enforced across users
- [ ] **TC-SEC-PAY-033** `[PROD-DATA]` — **Cancelling an order refunds the coupon use**
  - **Steps:** 1. Use `TESTONCE` 2. Cancel the order 3. Use it again
  - **Expect:** it works again. Confirm — a customer who can get orders cancelled
    can reuse a one-per-customer coupon indefinitely. **S3** with a note.
- [ ] **TC-SEC-PAY-034** `[PROD-SAFE]` — A discount cannot exceed the subtotal
  - **Steps:** a ₹500 fixed coupon on a ₹200 cart
  - **Expect:** ₹200 off, payable ₹0 — never negative.

---

## Gateway confirmation

- [ ] **TC-SEC-PAY-038** `[LOCAL-ONLY]` — No order is created without gateway confirmation
  - **Steps:** 1. Configure a plausible-but-wrong `RAZORPAY_KEY_SECRET` locally
    2. Craft a validly signed triple against it 3. Verify
  - **Expect:** the signature passes but the Razorpay API call fails →
    **503 "Could not confirm your payment with the gateway."** and **no order
    exists.** Failing closed is the correct behaviour.
  ```sql
  SELECT count(*) FROM orders WHERE razorpay_order_id = 'order_XXX';
  ```
  Must be 0.

- [ ] **TC-SEC-PAY-039** `[LOCAL-ONLY]` — A transient gateway error returns the intent
  - **Expect:** on a 503 the intent goes back to `created`, so the customer can
    retry and the webhook can still fulfil it.

- [ ] **TC-SEC-PAY-040** `[PROD-SAFE]` — Missing Razorpay config fails closed
  - **Expect:** **503 "Payment gateway not configured."** — never a free order.

---

## Money-loss ledger

- [ ] **TC-SEC-PAY-044** `[PROD-SAFE]` — No unresolved payment incidents
  ```sql
  SELECT id, razorpay_payment_id, amount_inr, reason, source, created_at
  FROM payment_incidents WHERE resolved_at IS NULL ORDER BY created_at DESC;
  ```
  **Expect:** empty. **Every row here is money captured with no order — S1.**
  Add this query to your daily operations checks.

- [ ] **TC-SEC-PAY-045** `[PROD-SAFE]` — Every paid order records what was captured
  ```sql
  SELECT id, total_inr, paid_amount_inr, payment_status FROM orders
  WHERE payment_status = 'paid' AND (paid_amount_inr IS NULL OR paid_amount_inr <> total_inr);
  ```
  **Expect:** empty. Any mismatch means the amount charged differs from the amount
  ordered — **S1**.

- [ ] **TC-SEC-PAY-046** `[PROD-SAFE]` — No order shares a Razorpay order id
  ```sql
  SELECT razorpay_order_id, count(*) FROM orders
  WHERE razorpay_order_id IS NOT NULL
  GROUP BY razorpay_order_id HAVING count(*) > 1;
  ```
  **Expect:** empty — enforced by a partial unique index.

- [ ] **TC-SEC-PAY-047** `[PROD-SAFE]` — No stuck intents
  ```sql
  SELECT id, status, created_at FROM checkout_intents
  WHERE status = 'consumed' AND order_id IS NULL
    AND created_at < now() - interval '1 hour';
  ```
  **Expect:** empty. A row here is a payment that claimed an intent and never
  produced an order — investigate each one.
