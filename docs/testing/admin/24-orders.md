# 24 — Orders

`/admin/orders` and `/admin/orders/[id]`

The only admin section staff can use, and the only one with search and filters.
Contains the **irreversible cancel** action, which has no confirmation dialog.

**Area prefix:** `TC-ADM-ORD`

---

## List — filters

- [ ] **TC-ADM-ORD-001** `[PROD-SAFE]` — Search matches a partial order ID
  - **Steps:** 1. Type the middle few characters of an order id
  - **Expect:** that order appears. Matching is case-insensitive substring.
- [ ] **TC-ADM-ORD-002** `[PROD-SAFE]` — Search matches a partial email
- [ ] **TC-ADM-ORD-003** `[PROD-SAFE]` — Search is debounced
  - **Steps:** 1. Open the Network tab 2. Type `test` quickly
  - **Expect:** one request after you stop, not four.
- [ ] **TC-ADM-ORD-004** `[PROD-SAFE]` — **A search for `%` returns everything**
  - **Steps:** 1. Type `%` in the search box
  - **Expect:** every order in the system, unpaginated, with decrypted customer PII.
  - ⚠ **KNOWN** KI-006. Record how many rows come back and how long it takes.
- [ ] **TC-ADM-ORD-005** `[PROD-SAFE]` — Status filter narrows to one status
  - **Steps:** try each of Pending, Confirmed, Shipped, Delivered, Cancelled
- [ ] **TC-ADM-ORD-006** `[PROD-SAFE]` — "All Statuses" restores everything
- [ ] **TC-ADM-ORD-007** `[PROD-SAFE]` — A From date filters inclusively from IST 00:00
  - **Steps:** 1. Set From to an order's date 2. Confirm that order is included
- [ ] **TC-ADM-ORD-008** `[PROD-SAFE]` — A To date filters inclusively to IST 23:59:59
  - **Steps:** 1. Set To to today 2. Confirm today's orders are included
- [ ] **TC-ADM-ORD-009** `[PROD-SAFE]` — A late-evening order lands on the right IST day
  - **Pre:** an order created after 18:30 UTC (i.e. after midnight IST)
  - **Expect:** it filters under the **next** IST day.
- [ ] **TC-ADM-ORD-010** `[PROD-SAFE]` — Search and status combine
- [ ] **TC-ADM-ORD-011** `[PROD-SAFE]` — All four filters combine
- [ ] **TC-ADM-ORD-012** `[PROD-SAFE]` — **There is no "Clear filters" button**
  - **Expect:** confirm absence — each input must be blanked by hand. Record as S3.
- [ ] **TC-ADM-ORD-013** `[PROD-SAFE]` — Filters are not in the URL
  - **Expect:** a filtered view cannot be shared or bookmarked.
- [ ] **TC-ADM-ORD-014** `[PROD-SAFE]` — No matches renders an empty table
- [ ] **TC-ADM-ORD-015** `[PROD-SAFE]` — There is no pagination and no result cap
  - **Expect:** confirm. Every match renders at once — note the behaviour with a
    large result set.

## List — columns

- [ ] **TC-ADM-ORD-019** `[PROD-SAFE]` — Eight columns render
  - **Expect:** Order ID, Customer, Total, Status, Tracking, Invoice, Date (IST),
    Actions.
- [ ] **TC-ADM-ORD-020** `[PROD-SAFE]` — Customer shows name over a fainter email
- [ ] **TC-ADM-ORD-021** `[PROD-DATA]` — A discounted order shows a green `−₹N coupon` line
- [ ] **TC-ADM-ORD-022** `[PROD-SAFE]` — Status badges are colour-coded distinctly
  - **Expect:** pending amber, confirmed blue, shipped purple, delivered green,
    cancelled red. Unlike the customer profile, these are genuinely distinguishable.
- [ ] **TC-ADM-ORD-023** `[PROD-SAFE]` — Missing tracking and invoice show `—`
- [ ] **TC-ADM-ORD-024** `[PROD-SAFE]` — Dates are IST
- [ ] **TC-ADM-ORD-025** `[PROD-SAFE]` — **There is no Add and no Delete**
  - **Expect:** confirm — orders cannot be created or deleted from the admin. Only
    "Edit" appears in Actions.
- [ ] **TC-ADM-ORD-026** `[PROD-SAFE]` — Orders are newest first

---

## Detail — read-only panels

- [ ] **TC-ADM-ORD-030** `[PROD-SAFE]` — The Customer panel shows name and email
- [ ] **TC-ADM-ORD-031** `[PROD-SAFE]` — **The shipping address is never displayed**
  - **Steps:** 1. Open an order with a full address 2. Read every panel
  - **Expect:** only name and email. Phone and address are fetched but not rendered.
  - ⚠ **KNOWN** KI-035. **Fulfilment staff cannot see where to ship the order** —
    this is a workflow blocker, worth S2 in practice.
- [ ] **TC-ADM-ORD-032** `[PROD-SAFE]` — Items list quantity, name, size and line total
- [ ] **TC-ADM-ORD-033** `[PROD-DATA]` — A discount line shows in green above the total
- [ ] **TC-ADM-ORD-034** `[PROD-SAFE]` — **Items cannot be edited**
  - **Expect:** confirm there is no add, remove, or quantity control. The items API
    is GET-only. Record as a product gap.

---

## Status transitions

Test **every cell**. Allowed transitions only:

| From | Allowed | Forbidden |
|---|---|---|
| `pending` | confirmed, cancelled | shipped, delivered, pending |
| `confirmed` | shipped, cancelled | pending, delivered, confirmed |
| `shipped` | delivered | pending, confirmed, cancelled, shipped |
| `delivered` | *(none)* | everything |
| `cancelled` | *(none)* | everything |

- [ ] **TC-ADM-ORD-038** `[PROD-DATA]` — The dropdown offers **only** allowed next statuses
  - **Steps:** 1. Open a `pending` order 2. Open the status dropdown
  - **Expect:** "— Keep current status —", Confirmed, Cancelled. **Not** Shipped or
    Delivered.
- [ ] **TC-ADM-ORD-039** `[PROD-DATA]` — A `confirmed` order offers Shipped and Cancelled
- [ ] **TC-ADM-ORD-040** `[PROD-DATA]` — A `shipped` order offers only Delivered
  - **Expect:** notably **no Cancelled** — a shipped order cannot be cancelled.
- [ ] **TC-ADM-ORD-041** `[PROD-DATA]` — A `delivered` order shows the terminal message
  - **Expect:** no dropdown, just *"This order is in a final state and cannot be
    changed."*
- [ ] **TC-ADM-ORD-042** `[PROD-DATA]` — A `cancelled` order shows the same
- [ ] **TC-ADM-ORD-043** `[LOCAL-ONLY]` — A forbidden transition is rejected by the API
  - **Steps:** bypass the UI and call it directly:
    ```bash
    curl -s -X PUT "$BASE/api/admin/orders/ORDER-ID" \
      -H "cookie: naami_session=$SESSION_ADMIN" \
      -H 'content-type: application/json' \
      -d '{"status":"shipped"}'      # on a pending order
    ```
  - **Expect:** **409** with
    `{"error":"Cannot change order status from \"pending\" to \"shipped\".","allowed":["confirmed","cancelled"]}`
- [ ] **TC-ADM-ORD-044** `[LOCAL-ONLY]` — An invalid status string returns 404
  - **Steps:** send `{"status":"banana"}`
  - **Expect:** **404** `{"error":"Not found or invalid status"}` — note this is
    conflated with "order does not exist". Record as S4.
- [ ] **TC-ADM-ORD-045** `[LOCAL-ONLY]` — A self-transition is rejected
  - **Steps:** send `{"status":"pending"}` on a pending order
  - **Expect:** 409.

### Cancellation side-effects

- [ ] **TC-ADM-ORD-049** `[PROD-DATA]` — **Cancelling has no confirmation dialog**
  - **Steps:** 1. Select Cancelled 2. Click "Update Status"
  - **Expect:** it happens immediately. Given it restores stock and voids a coupon
    redemption, record the absence as **S2**.
- [ ] **TC-ADM-ORD-050** `[PROD-DATA]` — Cancelling restores stock
  - **Steps:** 1. Note the size stock 2. Place and cancel a ₹1 order 3. Re-check
  - **Expect:** stock is back to its original value, not higher.
- [ ] **TC-ADM-ORD-051** `[PROD-DATA]` — Cancelling decrements coupon usage
  - **Steps:** 1. Order with `TESTONCE` 2. Note `usedCount` 3. Cancel 4. Re-check
  - **Expect:** decremented, floored at 0.
- [ ] **TC-ADM-ORD-052** `[PROD-DATA]` — Cancelling deletes the redemption row
  ```sql
  SELECT * FROM coupon_redemptions WHERE order_id = 'ORDER-ID';
  ```
  **Expect:** empty.
- [ ] **TC-ADM-ORD-053** `[PROD-DATA]` — **The per-user coupon cap is reset by cancelling**
  - **Steps:** 1. Use `TESTONCE` (per-user limit 1) 2. Cancel the order 3. Try to
    use it again
  - **Expect:** it works again. Confirm — this is exploitable by a customer who can
    get orders cancelled repeatedly. Record as S3 with a note.
- [ ] **TC-ADM-ORD-054** `[PROD-DATA]` — Cancelling an infinite-stock item does not inflate stock

---

## Tracking

- [ ] **TC-ADM-ORD-058** `[PROD-DATA]` — Tracking number, carrier and URL all save
- [ ] **TC-ADM-ORD-059** `[PROD-DATA]` — Saving tracking alone shows "Save Details"
  - **Expect:** the button label is "Save Details" with no status selected, and
    "Update Status" once one is.
- [ ] **TC-ADM-ORD-060** `[PROD-DATA]` — Selecting Shipped with no tracking shows a tip
  - **Expect:** an amber *"Tip: add a tracking number so the shipped email includes
    it."* — advisory only, it does not block.
- [ ] **TC-ADM-ORD-061** `[PROD-DATA]` — Changing tracking on a **shipped** order emails the customer
  - **Steps:** 1. On a shipped order, change the tracking number 2. Save
  - **Expect:** a tracking-update email arrives.
- [ ] **TC-ADM-ORD-062** `[PROD-DATA]` — Re-saving identical tracking sends **nothing**
- [ ] **TC-ADM-ORD-063** `[PROD-DATA]` — Changing tracking on a *pending* order sends nothing
- [ ] **TC-ADM-ORD-064** `[LOCAL-ONLY]` — The tracking URL is not validated
  - **Steps:** 1. Enter `javascript:alert(1)` 2. Save 3. View the customer order page
  - ⚠ **KNOWN** KI-038. See `customer/10-order-detail.md` TC-ORD-037.
  - **Cleanup:** clear the field.
- [ ] **TC-ADM-ORD-065** `[PROD-DATA]` — A tracking change creates **no** history entry
  - **Expect:** the Status History panel is unchanged. Only status changes are
    logged. Record as S3 — tracking edits are unauditable.

---

## Admin notes

- [ ] **TC-ADM-ORD-069** `[PROD-DATA]` — Notes save and persist
- [ ] **TC-ADM-ORD-070** `[PROD-DATA]` — Notes save alongside a status change
- [ ] **TC-ADM-ORD-071** `[PROD-DATA]` — **Notes are never exposed to the customer**
  - **Steps:** 1. Add a distinctive note 2. Open the customer order page as its
    owner 3. Search the page **and** the raw `/api/orders/{id}` JSON for that text
  - **Expect:** absent from both. **If present, report S2.**
- [ ] **TC-ADM-ORD-072** `[PROD-DATA]` — An emptied note is stored as null

---

## Invoice

- [ ] **TC-ADM-ORD-076** `[PROD-DATA]` — "Send Invoice to Customer" queues an email
  - **Expect:** the label cycles "Queuing…" → **"Invoice Queued ✓"** and an invoice
    number appears.
- [ ] **TC-ADM-ORD-077** `[PROD-DATA]` — The button disables after one click
  - **Expect:** it cannot be clicked twice without reloading.
- [ ] **TC-ADM-ORD-078** `[PROD-DATA]` — Reloading re-enables it and allows a second send
  - **Expect:** **no idempotency** — N reloads send N emails. Record as S3.
- [ ] **TC-ADM-ORD-079** `[PROD-DATA]` — An order with no email disables the button
  - **Expect:** disabled, plus an amber *"No customer email on this order."*
- [ ] **TC-ADM-ORD-080** `[PROD-DATA]` — The invoice number format is `NAAMI-INV-{year}-{0000}`
- [ ] **TC-ADM-ORD-081** `[PROD-DATA]` — The number is assigned once and never changes
  - **Steps:** 1. Send an invoice 2. Note the number 3. Send again
  - **Expect:** the same number.
- [ ] **TC-ADM-ORD-082** `[PROD-DATA]` — "Download PDF" downloads a valid invoice
  - **Expect:** a PDF named after the invoice number, opening correctly, with the
    right order details and totals.
- [ ] **TC-ADM-ORD-083** `[PROD-DATA]` — Downloading assigns a number if none exists
  - **Steps:** 1. On an order with no invoice number, click Download PDF 2. Reload
  - **Expect:** a number is now shown — a **GET with a side effect**. Worth noting.
- [ ] **TC-ADM-ORD-084** `[PROD-DATA]` — Invoice numbers are sequential per year
  - **Steps:** 1. Assign numbers to three orders 2. Confirm they increment

---

## Status history

- [ ] **TC-ADM-ORD-088** `[PROD-DATA]` — A new order shows "No status changes recorded yet."
- [ ] **TC-ADM-ORD-089** `[PROD-DATA]` — Each change adds an entry, newest first
- [ ] **TC-ADM-ORD-090** `[PROD-DATA]` — Entries show from → to, IST time, and the admin's email
- [ ] **TC-ADM-ORD-091** `[PROD-DATA]` — A note appears in its entry
- [ ] **TC-ADM-ORD-092** `[PROD-DATA]` — The customer timeline hides the actor and note
  - **See** `customer/10-order-detail.md` TC-ORD-029.

---

## Concurrency & save

- [ ] **TC-ADM-ORD-096** `[PROD-DATA]` — Two tabs changing status simultaneously
  - **Steps:** 1. Open one pending order in two tabs 2. In tab A set Confirmed and
    save 3. In tab B set Cancelled and save
  - **Expect:** tab B gets **409** with the allowed list, because the order is now
    confirmed and B's page is stale. Confirm the error is comprehensible.
- [ ] **TC-ADM-ORD-097** `[PROD-DATA]` — Cancel returns to the list with no warning
- [ ] **TC-ADM-ORD-098** `[PROD-DATA]` — Saving resets the status select and note
- [ ] **TC-ADM-ORD-099** `[PROD-DATA]` — A status change emails the customer
  - **Steps:** 1. Move an order to Confirmed 2. Check the customer mailbox
