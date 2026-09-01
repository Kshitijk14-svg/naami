# 25 — Coupons

`/admin/coupons`

Eleven form fields with server-side validation, plus a read-only redemptions view.
Contains KI-015 — the partial-update validation gap that allows a >100% discount.

**Area prefix:** `TC-ADM-CPN`

---

## List

- [ ] **TC-ADM-CPN-001** `[PROD-SAFE]` — Ten columns render
  - **Expect:** Code, Value, Min Order, Used, Per User / IP, Starts (IST),
    Expires (IST), Active, Usage, Actions.
- [ ] **TC-ADM-CPN-002** `[PROD-SAFE]` — A percent coupon shows `10%`
- [ ] **TC-ADM-CPN-003** `[PROD-DATA]` — A capped percent coupon shows `10% (max ₹50)`
- [ ] **TC-ADM-CPN-004** `[PROD-DATA]` — A fixed coupon shows `₹500`
- [ ] **TC-ADM-CPN-005** `[PROD-SAFE]` — No minimum shows `—`
- [ ] **TC-ADM-CPN-006** `[PROD-SAFE]` — Usage shows `used/limit` or `used/∞`
- [ ] **TC-ADM-CPN-007** `[PROD-SAFE]` — Unset per-user / per-IP limits show `∞`
- [ ] **TC-ADM-CPN-008** `[PROD-SAFE]` — Dates render in IST, or `—` when unset
- [ ] **TC-ADM-CPN-009** `[PROD-SAFE]` — Active shows green "Yes" / red "No"
- [ ] **TC-ADM-CPN-010** `[PROD-SAFE]` — No sort, pagination, search or status filter

---

## Create — validation

- [ ] **TC-ADM-CPN-014** `[PROD-DATA]` — A valid percent coupon saves
  - **Steps:** Code `ZZTEST10`, Percent, Value `10`, Save
- [ ] **TC-ADM-CPN-015** `[PROD-DATA]` — The code uppercases on blur
  - **Steps:** 1. Type `zztest10` 2. Click elsewhere
  - **Expect:** displays `ZZTEST10`.
- [ ] **TC-ADM-CPN-016** `[PROD-DATA]` — An empty code is rejected
  - **Expect:** "Coupon code is required."
- [ ] **TC-ADM-CPN-017** `[PROD-DATA]` — A whitespace-only code is rejected
- [ ] **TC-ADM-CPN-018** `[PROD-DATA]` — **A duplicate code returns a clean 409**
  - **Expect:** "Coupon code already exists" — this section handles it properly,
    unlike collections.
- [ ] **TC-ADM-CPN-019** `[PROD-DATA]` — A duplicate differing only in case is caught
  - **Steps:** with `ZZTEST10` existing, try `zztest10`
  - **Expect:** rejected — codes are normalised before comparison.
- [ ] **TC-ADM-CPN-020** `[PROD-DATA]` — A zero value is rejected
  - **Expect:** "discountValue must be a positive integer."
- [ ] **TC-ADM-CPN-021** `[PROD-DATA]` — A negative value is rejected identically
- [ ] **TC-ADM-CPN-022** `[PROD-DATA]` — A decimal value is rejected
  - **Steps:** Value `10.5`
  - **Expect:** the same message — integers only.
- [ ] **TC-ADM-CPN-023** `[PROD-DATA]` — Percent above 100 is rejected on create
  - **Steps:** Percent, Value `150`
  - **Expect:** "Percent discount cannot exceed 100."
- [ ] **TC-ADM-CPN-024** `[PROD-DATA]` — Percent exactly 100 is accepted
  - **Note:** this creates a coupon that breaks checkout — see KI-016 and
    `customer/07-checkout.md` TC-CHK-056.
- [ ] **TC-ADM-CPN-025** `[PROD-DATA]` — A fixed value above the cart total is allowed
  - **Expect:** it saves. At checkout the discount is capped at the subtotal, so the
    payable never goes negative.
- [ ] **TC-ADM-CPN-026** `[PROD-DATA]` — Non-numeric input in an optional field is rejected
  - **Steps:** Min Order `abc`
  - **Expect:** "minOrderValue must be a non-negative integer."
- [ ] **TC-ADM-CPN-027** `[PROD-DATA]` — Negative optional values are rejected
  - **Try:** Min Order, Max Discount, Usage Limit, Per-User, Per-IP — all with `-1`.

### Type-dependent layout

- [ ] **TC-ADM-CPN-031** `[PROD-DATA]` — Max Discount appears **only** for percent
  - **Steps:** 1. Select Percent — the field is visible 2. Select Fixed — it is gone
- [ ] **TC-ADM-CPN-032** `[PROD-DATA]` — Switching to Fixed nulls any Max Discount
  - **Steps:** 1. Percent with Max Discount 50 2. Switch to Fixed 3. Save 4. Reopen
  - **Expect:** Max Discount is empty.
- [ ] **TC-ADM-CPN-033** `[PROD-DATA]` — Min Order moves position with the type
  - **Expect:** beside Value for Fixed, on the next row for Percent. Cosmetic, but
    confirm it does not lose its value when switching.

### Dates

- [ ] **TC-ADM-CPN-037** `[PROD-DATA]` — Dates are entered in IST and stored as UTC
  - **Steps:** 1. Set Starts to `2026-06-01 10:00` 2. Save 3. Check the database
  ```sql
  SELECT code, starts_at FROM coupons WHERE code = 'ZZTEST10';
  ```
  **Expect:** `04:30` UTC — a 5:30 offset.
- [ ] **TC-ADM-CPN-038** `[PROD-DATA]` — Reopening shows the original IST time
- [ ] **TC-ADM-CPN-039** `[PROD-DATA]` — Start after expiry is rejected
  - **Expect:** "Start date must be before expiry date."
- [ ] **TC-ADM-CPN-040** `[PROD-DATA]` — **Clearing one date bypasses that check**
  - **Steps:** 1. Set Starts far in the future, Expires empty 2. Save
  - **Expect:** accepted — the cross-check needs both. Record as S4.
- [ ] **TC-ADM-CPN-041** `[PROD-DATA]` — Both dates empty means always valid

---

## Editing — the validation gap

- [ ] **TC-ADM-CPN-045** `[PROD-DATA]` — Editing prefills every field
- [ ] **TC-ADM-CPN-046** `[PROD-DATA]` — `usedCount` cannot be edited anywhere
- [ ] **TC-ADM-CPN-047** `[PROD-DATA]` — **A partial update can create a >100% coupon**
  - **Steps:** the UI always sends `discountType`, so use the API directly:
    ```bash
    curl -s -X PUT "$BASE/api/admin/coupons/COUPON_ID" \
      -H "cookie: naami_session=$SESSION_ADMIN" \
      -H 'content-type: application/json' \
      -d '{"discountValue": 500}'
    ```
    on an existing **percent** coupon.
  - **Expect:** it should be rejected. ⚠ **KNOWN** KI-015 — expect **200** and a
    500%-off coupon.
  - **Then:** check the list — Value should read `500%`. Try it at checkout and
    record what happens to the payable amount.
  - **Cleanup:** delete the coupon immediately.
- [ ] **TC-ADM-CPN-048** `[LOCAL-ONLY]` — A partial update can cap a fixed coupon
  - **Steps:** `-d '{"maxDiscountInr": 100}'` on a **fixed** coupon
  - **Expect:** should be rejected; likely accepted. ⚠ **KNOWN** KI-015.
- [ ] **TC-ADM-CPN-049** `[PROD-DATA]` — **PUT does not check for duplicate codes**
  - **Steps:** 1. Create `ZZTESTA` and `ZZTESTB` 2. Edit B's code to `ZZTESTA`
  - **Expect:** the create path 409s but the edit path does not check. Record what
    happens — the unique index should still catch it, producing an unhandled error.
- [ ] **TC-ADM-CPN-050** `[PROD-DATA]` — Deactivating stops the coupon working
  - **Steps:** 1. Uncheck Active 2. Try it in the cart
  - **Expect:** "Invalid or inactive coupon."

---

## Redemptions view

- [ ] **TC-ADM-CPN-054** `[PROD-DATA]` — "View" opens the redemptions modal
  - **Expect:** titled `Redemptions — {CODE}` with a single "Close" button.
- [ ] **TC-ADM-CPN-055** `[PROD-DATA]` — An unused coupon shows "No redemptions yet."
- [ ] **TC-ADM-CPN-056** `[PROD-DATA]` — A used coupon lists Order, User, IP, Discount, When
- [ ] **TC-ADM-CPN-057** `[PROD-DATA]` — Redemptions are newest first
- [ ] **TC-ADM-CPN-058** `[PROD-DATA]` — Cancelling an order removes its redemption row
  - **Steps:** 1. Order with the coupon 2. View redemptions 3. Cancel the order
    4. View again
  - **Expect:** the row is gone and `usedCount` has dropped.
- [ ] **TC-ADM-CPN-059** `[PROD-SAFE]` — The modal exposes customer emails and IPs
  - **Expect:** confirm — note it as a PII surface accessible to any admin.
- [ ] **TC-ADM-CPN-060** `[LOCAL-ONLY]` — A non-numeric coupon id is rejected
  ```bash
  curl -s "$BASE/api/admin/coupons/abc/redemptions" -H "cookie: naami_session=$SESSION_ADMIN"
  ```
  **Expect:** **400** `{"error":"Invalid coupon id"}` — the only admin route that
  validates its numeric path parameter.

---

## Runtime behaviour

Verify the admin settings actually govern checkout.

- [ ] **TC-ADM-CPN-064** `[PROD-DATA]` — A percent discount computes correctly
  - **Pre:** 10% coupon, ₹1000 cart → expect ₹100 off.
- [ ] **TC-ADM-CPN-065** `[PROD-DATA]` — A percent cap limits the discount
  - **Pre:** 10% capped at ₹50, ₹1000 cart → expect ₹50 off, not ₹100.
- [ ] **TC-ADM-CPN-066** `[PROD-DATA]` — A fixed discount cannot exceed the subtotal
  - **Pre:** ₹500 fixed, ₹200 cart → expect ₹200 off and a ₹0 payable.
  - **Note:** the ₹0 payable then hits KI-016.
- [ ] **TC-ADM-CPN-067** `[PROD-DATA]` — Below the minimum is rejected with the exact amount
- [ ] **TC-ADM-CPN-068** `[PROD-DATA]` — A not-yet-started coupon is rejected
- [ ] **TC-ADM-CPN-069** `[PROD-DATA]` — An expired coupon is rejected
- [ ] **TC-ADM-CPN-070** `[PROD-DATA]` — The total usage limit is enforced
  - **Steps:** 1. Set Usage Limit to 1 2. Use it 3. Try from a second account
  - **Expect:** "This coupon has reached its usage limit."
- [ ] **TC-ADM-CPN-071** `[PROD-DATA]` — The per-user limit is enforced
  - **Expect:** "You have already used this coupon the maximum number of times."
- [ ] **TC-ADM-CPN-072** `[PROD-DATA]` — The per-user limit does **not** block a different user
- [ ] **TC-ADM-CPN-073** `[LOCAL-ONLY]` — The per-IP limit is skipped when the IP is unknown
  - **Steps:** call `apply-coupon` with **no** `X-Forwarded-For` or `X-Real-IP`
  - **Expect:** the per-IP cap is not applied. See
    `security/45-rate-limits.md` — confirm nginx always sets `X-Real-IP` in
    production so this cannot happen there.
- [ ] **TC-ADM-CPN-074** `[PROD-DATA]` — `usedCount` increments on a successful order
  - **Note:** it increments at **create-order**, not at payment — so an abandoned
    checkout may still consume a use until the 15-minute sweeper releases it.
    Verify that release happens.

---

## Delete

- [ ] **TC-ADM-CPN-078** `[PROD-DATA]` — Delete confirms, then removes the row
- [ ] **TC-ADM-CPN-079** `[PROD-DATA]` — Deletion is a soft delete
- [ ] **TC-ADM-CPN-080** `[PROD-DATA]` — A deleted coupon stops working at checkout
- [ ] **TC-ADM-CPN-081** `[PROD-DATA]` — Orders that used it keep their discount
- [ ] **TC-ADM-CPN-082** `[PROD-DATA]` — A code can be recreated after deletion
  - **Steps:** 1. Delete `ZZTEST10` 2. Create it again
  - **Expect:** record whether the unique index blocks reuse of a soft-deleted code.
    If it does, that is a real operational limitation worth logging.
