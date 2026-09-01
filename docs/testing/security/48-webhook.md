# 48 — Webhook Security

`POST /api/webhooks/razorpay`

The only unauthenticated **mutating** endpoint in the application. It has no
session and no CSRF token — it is authenticated purely by an HMAC-SHA256 signature
over the **raw request body**, and it can create orders and decrement inventory.

**Area prefix:** `TC-SEC-WH`

---

## Prerequisites

- [ ] **TC-SEC-WH-001** `[PROD-SAFE]` — The secret is configured
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/webhooks/razorpay" \
    -H 'x-razorpay-signature: bogus' -d '{}'
  ```
  **Expect:** **401**. A **503** means `RAZORPAY_WEBHOOK_SECRET` is unset — the
  route fails closed, which is correct, but nothing below can be tested and **no
  payment is recoverable when a customer closes their tab.**

Signing helper for the cases below (local secret only — never put your production
secret in a shell history):

```bash
sign() { printf '%s' "$1" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | awk '{print $2}'; }
```

---

## Signature verification

- [ ] **TC-SEC-WH-005** `[PROD-SAFE]` — A missing signature header is rejected
  ```bash
  curl -s -w '\n%{http_code}\n' -X POST "$BASE/api/webhooks/razorpay" \
    -H 'content-type: application/json' -d '{"event":"payment.captured"}'
  ```
  **Expect:** **401** `{"error":"Invalid signature"}`

- [ ] **TC-SEC-WH-006** `[PROD-SAFE]` — A forged signature is rejected
  - **Steps:** send 64 zeros as the signature
  - **Expect:** **401**.

- [ ] **TC-SEC-WH-007** `[PROD-SAFE]` — A truncated signature is rejected
- [ ] **TC-SEC-WH-008** `[PROD-SAFE]` — An empty signature is rejected
- [ ] **TC-SEC-WH-009** `[PROD-SAFE]` — A signature from a different secret is rejected
  - **Steps:** sign a valid body with a wrong key

- [ ] **TC-SEC-WH-010** `[LOCAL-ONLY]` — **A valid signature is accepted**
  ```bash
  BODY='{"event":"payment.failed","payload":{}}'
  curl -s -w '\n%{http_code}\n' -X POST "$BASE/api/webhooks/razorpay" \
    -H 'content-type: application/json' \
    -H "x-razorpay-signature: $(sign "$BODY")" -d "$BODY"
  ```
  **Expect:** **200** `{"received":true,"handled":false,"event":"payment.failed"}` —
  proving verification works both ways.

- [ ] **TC-SEC-WH-011** `[LOCAL-ONLY]` — **Body tampering after signing is detected**
  - **Steps:** 1. Sign body A 2. Send body B with A's signature
    ```bash
    A='{"event":"payment.captured","payload":{"payment":{"entity":{"amount":100}}}}'
    B='{"event":"payment.captured","payload":{"payment":{"entity":{"amount":1}}}}'
    curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/webhooks/razorpay" \
      -H 'content-type: application/json' \
      -H "x-razorpay-signature: $(sign "$A")" -d "$B"
    ```
  - **Expect:** **401.** This is the case that proves the raw body is hashed. If it
    returned 200, the handler would be re-serialising parsed JSON before hashing —
    **S1**, because amounts could be edited in flight.

- [ ] **TC-SEC-WH-012** `[LOCAL-ONLY]` — Whitespace changes invalidate the signature
  - **Steps:** sign a compact body, send a pretty-printed version of the same JSON
  - **Expect:** **401** — semantically identical but byte-different.

- [ ] **TC-SEC-WH-013** `[PROD-SAFE]` — The comparison is constant-time
  - **Steps:** time 50 requests with a signature differing in the first character
    versus 50 differing only in the last
  - **Expect:** no meaningful difference. A measurable one would allow byte-by-byte
    signature recovery — **S2**.

---

## Payload handling

- [ ] **TC-SEC-WH-017** `[LOCAL-ONLY]` — Malformed JSON with a valid signature returns 400
  - **Steps:** sign the literal string `{` and send it
  - **Expect:** **400** `{"error":"Malformed payload"}` — signature checked first,
    then parsing.

- [ ] **TC-SEC-WH-018** `[LOCAL-ONLY]` — An unhandled event returns 200
  - **Steps:** send `{"event":"refund.created"}` correctly signed
  - **Expect:** **200** with `handled: false`. Deliberate — a non-200 would make
    Razorpay retry an event we will never act on.

- [ ] **TC-SEC-WH-019** `[LOCAL-ONLY]` — A handled event with a missing order id returns 200
  - **Steps:** `{"event":"payment.captured","payload":{}}`
  - **Expect:** **200**, `handled: false`, and **no order created**.

- [ ] **TC-SEC-WH-020** `[LOCAL-ONLY]` — **A valid signature for an unknown order creates no order**
  - **Steps:** correctly sign a `payment.captured` naming an order id we never issued
  - **Expect:** **200** (so Razorpay stops retrying) but **no order**, and a
    `payment_incidents` row is recorded:
    ```sql
    SELECT razorpay_order_id, reason, source FROM payment_incidents ORDER BY id DESC LIMIT 1;
    ```
    `source` should be `webhook`.
  - **Any order created here is S1** — it would mean a valid Razorpay signature for
    *any* merchant's order could mint one of yours.

- [ ] **TC-SEC-WH-021** `[LOCAL-ONLY]` — A huge payload is handled
  - **Steps:** send a correctly signed 10 MB body
  - **Expect:** rejected or handled without memory issues.

- [ ] **TC-SEC-WH-022** `[LOCAL-ONLY]` — Deeply nested JSON does not crash the parser

---

## Replay

- [ ] **TC-SEC-WH-026** `[LOCAL-ONLY]` — **Replaying a valid webhook is idempotent**
  - **Steps:** 1. Let a real webhook create an order 2. Replay the exact same
    request 5 times
  - **Expect:** **200** each time and **exactly one order**:
    ```sql
    SELECT razorpay_payment_id, count(*) FROM orders
    WHERE razorpay_payment_id IS NOT NULL
    GROUP BY razorpay_payment_id HAVING count(*) > 1;
    ```
    Must be empty. **A duplicate is S1** — the customer is charged once and shipped
    repeatedly.

- [ ] **TC-SEC-WH-027** `[LOCAL-ONLY]` — Replaying does not decrement stock again
  - **Steps:** 1. Note stock 2. Replay 5 times 3. Re-check
  - **Expect:** unchanged after the first.

- [ ] **TC-SEC-WH-028** `[LOCAL-ONLY]` — There is **no timestamp or nonce check**
  - **Steps:** replay a webhook captured days earlier
  - **Expect:** accepted — there is no replay window and no event-id dedupe.
    Idempotency comes entirely from the intent claim and the unique payment id.
  - **Record as S3** with that mitigation. It is defensible, but a timestamp
    tolerance would be stronger.

- [ ] **TC-SEC-WH-029** `[LOCAL-ONLY]` — Concurrent identical webhooks produce one order
  - **Steps:** fire the same valid webhook 10 times simultaneously
  - **Expect:** one order. The conditional `UPDATE … WHERE status='created'` claim
    is what serialises them — this is the case that proves it.

---

## Interaction with the browser callback

- [ ] **TC-SEC-WH-033** `[PROD-DATA]` — **The webhook alone produces the order**
  - **Steps:** 1. Start a ₹1 purchase 2. Complete payment 3. **Kill the tab
    immediately**, before the redirect
  - **Expect:** within a minute the order exists with `payment_status = 'paid'`.
    This is the entire reason the webhook exists.

- [ ] **TC-SEC-WH-034** `[PROD-DATA]` — Both paths together produce one order
  - **Steps:** complete a normal purchase and let the webhook arrive too
  - **Expect:** one order. Whichever wins the intent claim creates it; the other
    returns the same order id.

- [ ] **TC-SEC-WH-035** `[LOCAL-ONLY]` — A mid-flight race returns 409, not a duplicate
  - **Steps:** trigger the callback and the webhook at the same instant
  - **Expect:** one succeeds; the other gets either the same order id or **409
    "This payment is already being processed."** — never a second order.

- [ ] **TC-SEC-WH-036** `[LOCAL-ONLY]` — A webhook for an **expired** intent is recorded
  - **Steps:** 1. Create an intent 2. Let it expire (15 min) 3. Send a valid webhook
    for it
  - **Expect:** **200**, no order, and a `payment_incidents` row reading "Payment
    arrived for a expired checkout session." — money captured with the holds gone,
    flagged for manual resolution rather than silently shipped.

---

## Ownership

- [ ] **TC-SEC-WH-040** `[LOCAL-ONLY]` — The webhook does not take a user id from the payload
  - **Steps:** add `"userId": 999` to a correctly signed payload
  - **Expect:** ignored. Ownership comes from the stored intent, never the request.
  - **Verify** the created order belongs to the intent's real owner.

- [ ] **TC-SEC-WH-041** `[LOCAL-ONLY]` — The amount comes from the intent, not the payload
  - **Steps:** send a valid webhook whose payload amount differs from the intent
  - **Expect:** the order matches the **intent**, and the gateway confirmation
    rejects the mismatch. **An order at the payload's amount is S1.**

---

## Operational

- [ ] **TC-SEC-WH-045** `[PROD-SAFE]` — The endpoint is registered in the Razorpay dashboard
  - **Expect:** `https://naamiofficial.in/api/webhooks/razorpay` subscribed to
    **`payment.captured`** and **`order.paid`**.
- [ ] **TC-SEC-WH-046** `[PROD-SAFE]` — The dashboard shows successful deliveries
  - **Steps:** Razorpay → Webhooks → delivery log
  - **Expect:** 200s. Repeated failures mean payments are not being recovered.
- [ ] **TC-SEC-WH-047** `[PROD-SAFE]` — Nginx does not buffer or rewrite the body
  - **Expect:** if signature verification succeeds at all, the raw body is arriving
    intact. Confirm the `location /api/webhooks/` block does not add auth, rate
    limiting, or any body-modifying module.
- [ ] **TC-SEC-WH-048** `[PROD-SAFE]` — The webhook secret is not in the client bundle
  ```bash
  curl -s "$BASE" | grep -o 'RAZORPAY_WEBHOOK_SECRET' | head
  ```
  **Expect:** no match. **Any occurrence is S1.**
- [ ] **TC-SEC-WH-049** `[PROD-SAFE]` — Rotating the secret is a clean operation
  - **Steps:** document the order — update Razorpay, update `.env.production`,
    `pm2 reload --update-env`
  - **Expect:** record the window during which webhooks would 401, and confirm
    Razorpay's retries cover it.
