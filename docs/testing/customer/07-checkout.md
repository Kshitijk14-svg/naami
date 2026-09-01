# 07 — Checkout & Payment

`/checkout` · `src/app/checkout/page.tsx`

**The highest-risk page in the application.** It contains the two worst known
defects (KI-008 focus loss, KI-009 silent cancel) and every real charge flows
through it.

> **Production runs live Razorpay keys — every purchase here is a real charge.**
> Use the ₹1 test product from [`00-setup.md`](../00-setup.md), publish it only for
> the duration of a case, and refund + cancel afterwards.

**Area prefix:** `TC-CHK`

---

## Entry guards

- [ ] **TC-CHK-001** `[PROD-DATA]` — Hard-refreshing `/checkout` with a full cart
  - **Steps:** 1. Add items 2. Go to `/checkout` 3. Press Ctrl+F5
  - **Expect:** you should stay on `/checkout`. ⚠ **KNOWN** KI-011 — you may be
    bounced to `/cart` because the empty-cart guard runs before the cart rehydrates.
    Record whether it reproduces and how often.

- [ ] **TC-CHK-002** `[PROD-SAFE]` — **Typing in a field keeps focus** ⚠ **KNOWN** KI-008
  - **Steps:** 1. Click into "Full Name" 2. Type `John Smith` at normal speed
  - **Expect:** the field should contain `John Smith`. **Known defect:** focus is
    lost after each character, so you likely get `J` and the rest goes nowhere.
  - **This is the single most damaging bug on the site — verify it still
    reproduces and capture a screen recording.**

- [ ] **TC-CHK-003** `[PROD-SAFE]` — An empty cart redirects to `/cart`
  - **Steps:** 1. Empty the cart 2. Navigate directly to `/checkout`

- [ ] **TC-CHK-004** `[PROD-SAFE]` — A signed-out user can reach `/checkout`
  - **Expect:** the page renders. `/checkout` is **not** in the proxy matcher, so
    there is no auth gate until the Pay button.

- [ ] **TC-CHK-005** `[PROD-SAFE]` — The Razorpay script loads
  - **Steps:** 1. DevTools → Network, filter `razorpay`
  - **Expect:** `checkout.razorpay.com/v1/checkout.js` returns 200.

- [ ] **TC-CHK-006** `[PROD-SAFE]` — An `InitiateCheckout` pixel event fires once
  - **Expect:** exactly one, not one per render.

---

## Form fields

Eight fields. None have `maxLength`, `inputMode`, HTML `required`, `autoComplete`,
or any per-field inline error.

| # | Label | Type | Required |
|---|---|---|---|
| 1 | Full Name * | text | yes |
| 2 | Email * | email | yes |
| 3 | Phone * | tel | yes |
| 4 | Address Line 1 * | text | yes |
| 5 | Address Line 2 | text | no |
| 6 | City * | text | yes |
| 7 | State * | text | yes |
| 8 | PIN Code * | text | yes |

- [ ] **TC-CHK-010** `[PROD-SAFE]` — All eight fields render with the right labels
- [ ] **TC-CHK-011** `[PROD-SAFE]` — Email and Phone sit side by side at `md`+
- [ ] **TC-CHK-012** `[PROD-SAFE]` — City / State / PIN sit in three columns at `md`+
- [ ] **TC-CHK-013** `[PROD-SAFE]` — **State is free text, not a dropdown**
  - **Expect:** confirm there is no Indian-state picker. Record as S3 — free text
    means unnormalised shipping data.
- [ ] **TC-CHK-014** `[PROD-SAFE]` — Phone shows a numeric keypad on mobile?
  - **Expect:** `type="tel"` gives a phone keypad. Confirm on a real device.
- [ ] **TC-CHK-015** `[PROD-SAFE]` — PIN Code does **not** show a numeric keypad
  - **Expect:** it is `type="text"` with no `inputMode`. Record as S3.
- [ ] **TC-CHK-016** `[PROD-SAFE]` — No browser autofill hints
  - **Expect:** no `autoComplete` attributes, so saved addresses do not offer to
    fill. Record as S3.
- [ ] **TC-CHK-017** `[PROD-SAFE]` — No validation fires on blur
  - **Steps:** 1. Type `notanemail` in Email 2. Click elsewhere
  - **Expect:** nothing happens until you press Pay.

---

## Validation

Runs **only on Pay**, returns the **first** failure, shown in a single maroon box.

- [ ] **TC-CHK-020** `[PROD-SAFE]` — Empty name → **"Full name is required."**
- [ ] **TC-CHK-021** `[PROD-SAFE]` — Whitespace-only name is also rejected
- [ ] **TC-CHK-022** `[PROD-SAFE]` — Bad email → **"Valid email is required."**
  - **Try:** `notanemail`, `a@b`, `@b.com`, `a b@c.com`
- [ ] **TC-CHK-023** `[PROD-SAFE]` — Valid email formats pass
  - **Try:** `a@b.co`, `first.last+tag@example.co.in`
- [ ] **TC-CHK-024** `[PROD-SAFE]` — Bad phone → **"10-digit phone number is required."**
  - **Try each and record:**
    | Input | Expected |
    |---|---|
    | `9876543210` | ✅ passes |
    | `98765 43210` | ✅ passes — non-digits are stripped first |
    | `(987) 654-3210` | ✅ passes |
    | `+919876543210` | ❌ fails — 12 digits after stripping |
    | `09876543210` | ❌ fails — 11 digits |
    | `987654321` | ❌ fails — 9 digits |
    | `0000000000` | ✅ passes — only length is checked |
  - **Note:** rejecting `+91` prefixes is a real usability problem worth recording.
- [ ] **TC-CHK-025** `[PROD-SAFE]` — Empty address line 1 → **"Address line 1 is required."**
- [ ] **TC-CHK-026** `[PROD-SAFE]` — Address line 2 is genuinely optional
- [ ] **TC-CHK-027** `[PROD-SAFE]` — Empty city → **"City is required."**
- [ ] **TC-CHK-028** `[PROD-SAFE]` — Empty state → **"State is required."**
- [ ] **TC-CHK-029** `[PROD-SAFE]` — Bad PIN → **"6-digit PIN code is required."**
  - **Try:** `12345` ❌ · `1234567` ❌ · `abcdef` ❌ · `000000` ✅ (any 6 digits pass)
- [ ] **TC-CHK-030** `[PROD-SAFE]` — Only the **first** error shows
  - **Steps:** 1. Leave every field empty 2. Click Pay
  - **Expect:** "Full name is required." alone — not a list.

---

## Coupon display

- [ ] **TC-CHK-034** `[PROD-DATA]` — A valid `?coupon=` shows a green discount row
  - **Steps:** 1. Apply `TESTPCT` in the cart 2. Proceed to checkout
  - **Expect:** **"Coupon (TESTPCT) −₹X"** in the summary and a reduced total.
- [ ] **TC-CHK-035** `[PROD-DATA]` — The discount **updates** when quantities change
  - **Note:** unlike the cart (KI-029), checkout re-fetches on item change.
- [ ] **TC-CHK-036** `[PROD-SAFE]` — An invalid `?coupon=` is silently ignored
  - **Steps:** 1. Load `/checkout?coupon=NOTAREALCODE`
  - **Expect:** no discount row and **no error message**. ⚠ **KNOWN** KI-030.
- [ ] **TC-CHK-037** `[PROD-SAFE]` — An expired coupon is also silent
- [ ] **TC-CHK-038** `[PROD-SAFE]` — Signed out, a valid coupon is silently ignored

---

## Order summary

- [ ] **TC-CHK-042** `[PROD-DATA]` — Every cart line appears with size and quantity
- [ ] **TC-CHK-043** `[PROD-DATA]` — Names render in sentence case here
  - **Note:** deliberately different from the cart's uppercase.
- [ ] **TC-CHK-044** `[PROD-DATA]` — The total matches the cart total
- [ ] **TC-CHK-045** `[PROD-SAFE]` — There is no shipping, tax or GST line
  - **Expect:** confirm absence. Record as a product gap if shipping should be
    charged.
- [ ] **TC-CHK-046** `[PROD-SAFE]` — There is no order-notes field, saved-address
      picker, billing-address option or gift option
- [ ] **TC-CHK-047** `[PROD-SAFE]` — "← Edit Cart" returns to `/cart` with items intact

---

## Payment — failure paths first

Run these **before** the success path. None of them charge anything.

- [ ] **TC-CHK-050** `[PROD-SAFE]` — Signed out, Pay shows only **"Unauthorized"**
  - **Steps:** 1. Sign out 2. Add an item, go to `/checkout` 3. Fill every field
    correctly 4. Click Pay
  - **Expect:** the bare word `Unauthorized` in the error box, **no sign-in prompt
    and no redirect**. ⚠ **KNOWN** KI-010. Capture a screenshot — this is a
    conversion-killer.

- [ ] **TC-CHK-051** `[PROD-SAFE]` — Blocking the Razorpay script gives a clear message
  - **Steps:** 1. DevTools → Network → block `checkout.razorpay.com` 2. Reload
    3. Fill the form and click Pay
  - **Expect:** **"Payment gateway not loaded. Please refresh the page."**

- [ ] **TC-CHK-052** `[PROD-DATA]` — An out-of-stock item is rejected at Pay
  - **Pre:** an item in the cart whose stock you then set to 0
  - **Expect:** a 409 with the stock message, e.g. `Only 0 left of "NAME" (M).`
    The Razorpay popup never opens.
  - **Cleanup:** restore stock.

- [ ] **TC-CHK-053** `[PROD-DATA]` — A 21-quantity line is rejected at Pay
  - **Expect:** "You can order at most 20 of any one item…"

- [ ] **TC-CHK-054** `[PROD-DATA]` — An unpublished item is rejected at Pay
  - **Expect:** "One or more items are no longer available."

- [ ] **TC-CHK-055** `[LOCAL-ONLY]` — More than 12 attempts in 5 minutes is throttled
  - **Expect:** "Too many checkout attempts. Please wait a moment."

- [ ] **TC-CHK-056** `[PROD-DATA]` — A 100%-off coupon fails at the gateway
  - **Pre:** coupon `TESTFULL` (100%)
  - **Steps:** 1. Apply it 2. Click Pay
  - **Expect:** **"Failed to create payment order."** ⚠ **KNOWN** KI-016 — Razorpay
    rejects a ₹0 order. Note that stock holds are already taken at this point and
    will sit for 15 minutes.
  - **Cleanup:** wait for the sweeper or verify the hold releases.

---

## Payment — the Razorpay handoff

- [ ] **TC-CHK-060** `[PROD-DATA]` — Valid form + valid cart opens the Razorpay popup
  - **Pre:** ₹1 test product published, signed in
  - **Expect:** the popup opens showing **"NAAMI Atelier"**, the correct amount, and
    `Order — N item(s)` correctly pluralised.

- [ ] **TC-CHK-061** `[PROD-DATA]` — Name, email and phone are prefilled from the form

- [ ] **TC-CHK-062** `[PROD-DATA]` — **Cancelling the popup is completely silent**
  - **Steps:** 1. Open the popup 2. Close it with the × or press Escape
  - **Expect:** you return to the form with **no message at all**. The cart is
    unchanged and your stock is still held for 15 minutes.
  - ⚠ **KNOWN** KI-009. Confirm the silence and capture it.

- [ ] **TC-CHK-063** `[PROD-DATA]` — Retrying after a cancel works
  - **Steps:** 1. Cancel 2. Click Pay again
  - **Expect:** a **new** Razorpay order opens. Check `checkout_intents` — you
    should now have two `created` rows for one shopper. Note whether the first one's
    stock hold is still active, since that reduces available stock for everyone.

- [ ] **TC-CHK-064** `[PROD-DATA]` — A failed card is handled by Razorpay
  - **Expect:** the popup shows its own failure UI; our page is untouched.

---

## Payment — the success path

**Real money.** ₹1 test product only.

- [ ] **TC-CHK-070** `[PROD-DATA]` — A successful payment creates the order and redirects
  - **Steps:** 1. Pay for the ₹1 product 2. Wait
  - **Expect:** redirected to `/orders/{id}` showing the confirmation.
  - **Verify in the database:**
    ```sql
    SELECT id, total_inr, paid_amount_inr, payment_status, status
    FROM orders ORDER BY created_at DESC LIMIT 1;
    ```
    `payment_status` must be **`paid`** and `paid_amount_inr` must equal what
    Razorpay actually captured.
  - **Cleanup:** refund in the Razorpay dashboard, then cancel the order in admin.

- [ ] **TC-CHK-071** `[PROD-DATA]` — The cart is emptied after success
- [ ] **TC-CHK-072** `[PROD-DATA]` — A `Purchase` pixel event fires with the correct value
  - **Expect:** the whole-rupee amount — this event is **not** affected by KI-039.
- [ ] **TC-CHK-073** `[PROD-DATA]` — Stock decrements by exactly the quantity ordered
  - **Steps:** 1. Note stock before 2. Buy 1 3. Check stock after
  - **Expect:** exactly one less. Not two — that would mean double decrement.
- [ ] **TC-CHK-074** `[PROD-DATA]` — A confirmation email arrives
- [ ] **TC-CHK-075** `[PROD-DATA]` — The stock hold is consumed, not left active
  ```sql
  SELECT id, released_at FROM stock_reservations
  WHERE intent_id = (SELECT id FROM checkout_intents ORDER BY id DESC LIMIT 1);
  ```
  **Expect:** `released_at` is set.
- [ ] **TC-CHK-076** `[PROD-DATA]` — The checkout intent is marked consumed with an order id
  ```sql
  SELECT id, status, order_id FROM checkout_intents ORDER BY id DESC LIMIT 1;
  ```
  **Expect:** `status = 'consumed'` and `order_id` populated.
- [ ] **TC-CHK-077** `[PROD-DATA]` — A coupon purchase increments `usedCount` and logs a redemption

### Webhook backstop

- [ ] **TC-CHK-080** `[PROD-DATA]` — Killing the tab after payment still produces the order
  - **Pre:** `RAZORPAY_WEBHOOK_SECRET` configured
  - **Steps:** 1. Start a ₹1 purchase 2. Complete payment in the popup 3. **Close
    the tab immediately**, before the redirect
  - **Expect:** within a minute the order exists in `/admin/orders` with
    `payment_status = 'paid'`. This is the entire point of the webhook.
  - **Cleanup:** refund and cancel.

- [ ] **TC-CHK-081** `[PROD-DATA]` — No duplicate order when both paths run
  - **Steps:** 1. Complete a normal purchase 2. Wait for the webhook too
  - **Expect:** exactly **one** order row for that payment.
    ```sql
    SELECT razorpay_payment_id, count(*) FROM orders
    WHERE razorpay_payment_id IS NOT NULL
    GROUP BY razorpay_payment_id HAVING count(*) > 1;
    ```
    Must return zero rows.

- [ ] **TC-CHK-082** `[PROD-DATA]` — No captured payment is left without an order
  ```sql
  SELECT * FROM payment_incidents WHERE resolved_at IS NULL;
  ```
  **Expect:** empty. Anything here is **money taken with no order** — S1, report
  immediately.
