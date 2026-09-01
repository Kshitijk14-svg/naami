# 10 — Order Detail & Feedback

`/orders/[id]` · `src/app/orders/[id]/page.tsx`

Doubles as the post-purchase confirmation page and the permanent order record.
Proxy-protected, with per-order ownership enforced at the API.

**Area prefix:** `TC-ORD`

---

## Access & ownership

- [ ] **TC-ORD-001** `[PROD-SAFE]` — Signed out redirects to `/auth?from=/orders/{id}`
- [ ] **TC-ORD-002** `[PROD-DATA]` — Your own order renders fully
- [ ] **TC-ORD-003** `[PROD-DATA]` — **Another customer's order shows "Order not found."**
  - **Pre:** an order id belonging to a different customer account
  - **Steps:** 1. Signed in as customer A, open `/orders/{B's order id}`
  - **Expect:** "Order not found." with a "Return to Atelier" link — **not** a
    permission error. The 404 is deliberate so existence is never confirmed.
  - **If you can see another customer's order, stop and report S1.**
- [ ] **TC-ORD-004** `[PROD-SAFE]` — A nonexistent id shows the same 404 page
  - **Expect:** visually identical to TC-ORD-003 — that is the point.
- [ ] **TC-ORD-005** `[PROD-SAFE]` — A garbage id behaves the same
  - **Steps:** `/orders/NOT-AN-ID`
- [ ] **TC-ORD-006** `[PROD-DATA]` — A **staff** account can open any customer's order here
  - **Pre:** signed in as staff, using a customer's order id
  - **Expect:** it renders. The ownership check only applies to `role === "customer"`.
  - **See** `security/42-access-control.md` — ⚠ **KNOWN** KI-006.

---

## States

- [ ] **TC-ORD-010** `[PROD-DATA]` — A pulsing bar shows while loading
  - **Note:** there is no route skeleton for this page.
- [ ] **TC-ORD-011** `[PROD-DATA]` — The page scrolls to the top on open
- [ ] **TC-ORD-012** `[LOCAL-ONLY]` — **A failed items fetch renders zero items silently**
  - **Steps:** 1. Block `/api/orders/*/items` only 2. Open an order
  - **Expect:** the order header, status and **Total** all render, but the item list
    is empty with **no message**.
  - ⚠ **KNOWN** KI-026. A customer sees a total with nothing to explain it.
- [ ] **TC-ORD-013** `[LOCAL-ONLY]` — A failed order fetch shows "Order not found."

---

## Confirmation header

- [ ] **TC-ORD-016** `[PROD-DATA]` — Shows "NAAMI // ORDER CONFIRMED" and "Thank you, {firstName}"
- [ ] **TC-ORD-017** `[PROD-DATA]` — With no shipping name it reads just "Thank you"
- [ ] **TC-ORD-018** `[PROD-DATA]` — The confirmation line names the email address
  - **Expect:** *"A confirmation has been sent to {email}."* — the clause is omitted
    entirely when there is no email.

---

## Order reference

- [ ] **TC-ORD-021** `[PROD-DATA]` — Order id, long-form date and status all render
- [ ] **TC-ORD-022** `[PROD-DATA]` — Status labels are human-readable
  - **Expect:** `pending` → **"Order Placed"**, `confirmed` → "Confirmed",
    `shipped` → "Shipped", `delivered` → "Delivered", `cancelled` → "Cancelled".
    Never the raw enum.

---

## Order journey timeline

- [ ] **TC-ORD-025** `[PROD-DATA]` — The timeline is **absent** on a brand-new order
  - **Expect:** no "Order Journey" section until a status change has happened.
- [ ] **TC-ORD-026** `[PROD-DATA]` — After a status change the timeline appears
  - **Steps:** 1. In admin, move the order pending → confirmed 2. Reload
  - **Expect:** an entry with the mapped label and an IST timestamp.
- [ ] **TC-ORD-027** `[PROD-DATA]` — Entries are newest first
- [ ] **TC-ORD-028** `[PROD-DATA]` — Times are shown in IST
- [ ] **TC-ORD-029** `[PROD-DATA]` — **Admin notes and the actor are not exposed**
  - **Pre:** an admin status change with an internal note attached
  - **Steps:** 1. View the timeline 2. Open DevTools → Network and read the raw JSON
    from `/api/orders/{id}`
  - **Expect:** neither the note text nor the admin's email appears anywhere,
    including in the raw response. **If they do, report S2** — internal notes are
    leaking to customers.

---

## Tracking

- [ ] **TC-ORD-033** `[PROD-DATA]` — The block is absent with no tracking number
- [ ] **TC-ORD-034** `[PROD-DATA]` — With a tracking number it shows
- [ ] **TC-ORD-035** `[PROD-DATA]` — The carrier line appears only when set
- [ ] **TC-ORD-036** `[PROD-DATA]` — "Track Shipment →" opens the URL in a new tab
  - **Expect:** it appears only when a tracking URL is set.
- [ ] **TC-ORD-037** `[LOCAL-ONLY]` — A `javascript:` tracking URL
  - **Pre:** in admin, set the tracking URL to `javascript:alert(1)`
  - **Steps:** 1. Open the customer order page 2. Click "Track Shipment"
  - **Expect:** nothing should execute. ⚠ **KNOWN** KI-038 — the URL is stored and
    rendered with no validation. Record exactly what happens.
  - **Cleanup:** clear the tracking URL.

---

## Items

- [ ] **TC-ORD-041** `[PROD-DATA]` — Each line shows name, size, quantity and line total
  - **Expect:** `Size: M · Qty: 2` and the correct amount.
- [ ] **TC-ORD-042** `[PROD-DATA]` — **A sizeless line hides the quantity entirely**
  - **Pre:** an order containing a product with no sizes
  - **Expect:** neither size nor quantity is displayed on that line — only the name
    and the line total.
  - ⚠ **KNOWN** KI-025. A customer cannot tell how many they bought.
- [ ] **TC-ORD-043** `[PROD-DATA]` — The Total matches the order record
- [ ] **TC-ORD-044** `[PROD-DATA]` — The total reflects any coupon discount applied

---

## Shipping address

- [ ] **TC-ORD-048** `[PROD-DATA]` — The address renders in the right shape
  - **Expect:** name / line1[, line2] / city, state — pincode.
- [ ] **TC-ORD-049** `[PROD-DATA]` — Address line 2 is omitted when blank
- [ ] **TC-ORD-050** `[LOCAL-ONLY]` — A malformed stored address hides the block silently
  - **Steps:** 1. Corrupt `orders.shipping_address` to non-JSON for a test order
    2. Reload the page
  - **Expect:** the whole address block disappears with no error.
  - **Cleanup:** restore the value.

---

## Missing features

Confirm these are absent and record them as product gaps.

- [ ] **TC-ORD-054** `[PROD-DATA]` — There is **no invoice download** on this page
  - **Note:** `/api/orders/{id}/invoice` exists and works, but nothing links to it.
    A customer cannot get their own invoice without an admin emailing it. Record as
    S3.
- [ ] **TC-ORD-055** `[PROD-SAFE]` — There is no cancel-order button
- [ ] **TC-ORD-056** `[PROD-SAFE]` — There is no reorder button
- [ ] **TC-ORD-057** `[PROD-SAFE]` — There is no contact-support or returns link
- [ ] **TC-ORD-058** `[PROD-SAFE]` — "Continue Shopping" → `/`, "Browse Collections" → `/collection`

---

## Feedback form

`src/components/FeedbackForm.tsx` · renders **only** when status is `delivered`

- [ ] **TC-ORD-062** `[PROD-DATA]` — Absent on a pending, confirmed or shipped order
- [ ] **TC-ORD-063** `[PROD-DATA]` — Appears once the order is marked delivered
  - **Steps:** 1. In admin move the order through to `delivered` 2. Reload
- [ ] **TC-ORD-064** `[PROD-DATA]` — Hovering a star previews that rating
- [ ] **TC-ORD-065** `[PROD-DATA]` — Moving away restores the selected rating
- [ ] **TC-ORD-066** `[PROD-DATA]` — Clicking a star selects it
- [ ] **TC-ORD-067** `[PROD-DATA]` — A rating cannot be cleared once set
  - **Expect:** confirm — there is no zero/clear affordance. Record as S4.
- [ ] **TC-ORD-068** `[PROD-DATA]` — Keyboard arrows do not change the rating
  - **Expect:** no keyboard support. Record as an accessibility gap.
- [ ] **TC-ORD-069** `[PROD-DATA]` — Submitting with no rating shows "Please select a rating."
- [ ] **TC-ORD-070** `[PROD-DATA]` — The comment is optional
  - **Steps:** 1. Pick 5 stars 2. Submit with an empty comment
  - **Expect:** accepted.
- [ ] **TC-ORD-071** `[PROD-DATA]` — The comment is capped at 1000 characters
  - **Steps:** 1. Paste 1500 characters
  - **Expect:** the field holds 1000. There is **no character counter** — record as
    S4.
- [ ] **TC-ORD-072** `[PROD-DATA]` — Successful submission replaces the form
  - **Expect:** "Thank you for sharing your thoughts with NAAMI."
- [ ] **TC-ORD-073** `[PROD-DATA]` — Reloading shows a **fresh form**, allowing a second submission
  - **Steps:** 1. Submit feedback 2. Reload the page
  - **Expect:** the form is back and you can submit again. There is no
    duplicate guard in the UI — only the 5-per-hour server cap. Record as S3.
- [ ] **TC-ORD-074** `[LOCAL-ONLY]` — More than 5 submissions in an hour is throttled
  - **Expect:** "Too many feedback submissions. Please try again later."
- [ ] **TC-ORD-075** `[PROD-DATA]` — Feedback appears in `/admin/feedback`
- [ ] **TC-ORD-076** `[PROD-DATA]` — Feedback cannot be attached to someone else's order
  - **Steps:** 1. `curl` a feedback POST with another account's `orderId`
    ```bash
    curl -s -X POST "$BASE/api/feedback" \
      -H "cookie: naami_session=$SESSION_CUSTOMER" \
      -H 'content-type: application/json' \
      -d '{"rating":5,"orderId":"OTHER-USERS-ORDER-ID"}'
    ```
  - **Expect:** **404** `{"error":"Order not found."}`
