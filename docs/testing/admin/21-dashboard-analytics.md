# 21 — Dashboard & Analytics

`/admin` and `/admin/analytics`

Both are read-only. No forms, no buttons beyond navigation, no filters.

**Area prefix:** `TC-ADM-DSH`

---

## Dashboard

- [ ] **TC-ADM-DSH-001** `[PROD-SAFE]` — The heading greets you by role
  - **Expect:** "NAAMI // ATELIER ADMIN" and `Welcome, Admin` (or Staff /
    Super Admin). Shows "…" until the session resolves.
- [ ] **TC-ADM-DSH-002** `[PROD-SAFE]` — An admin sees eight tiles
  - **Expect:** Analytics, Products, Collections, Categories, Coupons, Orders, Blog,
    Design.
- [ ] **TC-ADM-DSH-003** `[PROD-SAFE]` — Staff sees exactly one tile — Orders
- [ ] **TC-ADM-DSH-004** `[PROD-SAFE]` — Every tile navigates to the right page
  - **Steps:** click all eight in turn
- [ ] **TC-ADM-DSH-005** `[PROD-SAFE]` — Each tile shows a title, description and "Enter →"
- [ ] **TC-ADM-DSH-006** `[PROD-SAFE]` — There is no Feedback tile ⚠ **KNOWN** KI-042
  - **Expect:** confirm absence despite Feedback being in the sidebar.
- [ ] **TC-ADM-DSH-007** `[LOCAL-ONLY]` — A failed session fetch shows an empty grid
  - **Steps:** 1. Block `/api/auth/me` 2. Load `/admin`
  - **Expect:** no tiles at all, and **no error message**. Record what a user would
    make of it.
- [ ] **TC-ADM-DSH-008** `[PROD-SAFE]` — The page has no forms, tables or actions

---

## Analytics

- [ ] **TC-ADM-DSH-012** `[PROD-SAFE]` — A pulsing dot shows while loading
- [ ] **TC-ADM-DSH-013** `[PROD-SAFE]` — Four stat cards render
  - **Expect:** **Total Revenue**, **Pending Orders**, **Shipped**, **Delivered**.
  - **Note:** Confirmed and Cancelled counts are **not** given cards — they appear
    only in the status breakdown below. Record as S4 if that seems wrong.
- [ ] **TC-ADM-DSH-014** `[PROD-SAFE]` — Total Revenue is formatted as INR
  - **Expect:** Indian digit grouping, e.g. `₹1,00,000`.
- [ ] **TC-ADM-DSH-015** `[PROD-DATA]` — Revenue matches the sum of non-cancelled orders
  ```sql
  SELECT sum(total_inr) FROM orders WHERE status != 'cancelled';
  ```
  **Expect:** the card matches. If cancelled orders are included, report S2 —
  revenue would be overstated.
- [ ] **TC-ADM-DSH-016** `[PROD-SAFE]` — "Orders by Status" lists all five statuses
  - **Expect:** pending, confirmed, shipped, delivered, cancelled — in that fixed
    order, each with a coloured badge and a count.
- [ ] **TC-ADM-DSH-017** `[PROD-DATA]` — Status counts match the database
  ```sql
  SELECT status, count(*) FROM orders GROUP BY status ORDER BY status;
  ```
- [ ] **TC-ADM-DSH-018** `[PROD-SAFE]` — "Top Products" shows at most **5** rows
  - **Expect:** ranked 1..5 with `{count} units · ₹{revenue}`. Even with 50
    products, only five appear — this is a server-side limit.
- [ ] **TC-ADM-DSH-019** `[PROD-SAFE]` — With no orders it shows "No order data yet"
- [ ] **TC-ADM-DSH-020** `[PROD-SAFE]` — "Recent Orders" shows at most **5** rows
  - **Expect:** Order ID, Customer, Total, Status, Date.
- [ ] **TC-ADM-DSH-021** `[PROD-SAFE]` — Recent Orders rows are **not clickable**
  - **Steps:** 1. Click a row
  - **Expect:** nothing happens, and there is no "view all" link. Record as S3 — an
    obvious workflow gap.
- [ ] **TC-ADM-DSH-022** `[PROD-SAFE]` — The Recent Orders date is **not** IST-converted
  - **Steps:** 1. Compare a date here against the same order in `/admin/orders`
  - **Expect:** the orders list uses IST; this table uses plain `en-IN` with no
    timezone. Late-evening orders may show a different day in the two places.
    Record as S3.
- [ ] **TC-ADM-DSH-023** `[PROD-SAFE]` — A customer with no name shows `—`
- [ ] **TC-ADM-DSH-024** `[LOCAL-ONLY]` — A failed fetch shows "Failed to load analytics"
  - **Steps:** 1. Block `/api/admin/analytics` 2. Reload
- [ ] **TC-ADM-DSH-025** `[PROD-SAFE]` — There are no date-range or other filters
  - **Expect:** confirm absence — the figures are all-time only. Record as S3.
- [ ] **TC-ADM-DSH-026** `[PROD-DATA]` — Analytics update after a new order
  - **Steps:** 1. Note Pending Orders 2. Place a ₹1 test order 3. Reload analytics
  - **Expect:** the count increments and the order appears in Recent Orders.
- [ ] **TC-ADM-DSH-027** `[PROD-DATA]` — Cancelling an order updates the breakdown
  - **Steps:** 1. Cancel the test order 2. Reload
  - **Expect:** pending decrements, cancelled increments, and revenue drops by that
    order's total.
