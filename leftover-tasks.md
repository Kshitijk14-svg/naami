# NAAMI 6-Feature Rollout — Leftover Tasks

Status snapshot after implementing all 6 phases of the rollout plan
(`.claude/plans/in-the-3rd-slide-ancient-shell.md`). All code is written and
`npx tsc --noEmit` / `npm run lint` are clean. **Nothing has been verified
live yet** — Postgres (Docker Desktop) was down for this entire session, so
no migration has been applied and no browser testing has happened.

## 1. Apply the 3 pending migrations, in order

```
npm run db:generate   # (already run — migrations exist on disk, this is a no-op check)
npm run db:migrate
```

- `src/db/migrations/0009_natural_joshua_kane.sql` — adds `products.compare_at_price_inr` (nullable, no backfill needed).
- `src/db/migrations/0010_tidy_rhino.sql` — adds `product_sizes.stock`, **includes a backfill** that seeds every existing size row with that product's current total stock (`products.stock`). This is NOT a real per-size split — it's a placeholder so existing sized products don't all look out-of-stock immediately after migrating.
- `src/db/migrations/0011_happy_fat_cobra.sql` — adds `brand_feedback` table (purely additive, no backfill).

**Manual follow-up required after migrating:** go through `/admin/products` for every product that has sizes and correct the per-size stock numbers in the new "Sizes & Stock" field — right now they're all set to the old product-level total, not the real breakdown.

## 2. Verify each phase live

Go through `/code-review` or manual testing once Postgres is up. Checklist per phase (from the plan file):

- **Phase 2 (compare-at price):** set Price ₹2,000 / Compare-at ₹3,000 on a product in `/admin/products`, confirm carousel + product detail page + `/collection` show ₹2,000 struck-through ₹3,000 with a "−33%" badge. Confirm cart total is still unaffected (uses `priceInr` only).
- **Phase 3 (tagline):** complete a test checkout, confirm "If found Wear again" appears on `/orders/[id]` under the thank-you heading, and on `/cart` in both populated and empty states.
- **Phase 4 (announcement bar):** enable one slot in `/admin/design` → Announcements tab, confirm the bar renders above the navbar on every page without clipping content (check all former `pt-20` pages plus `/collection` and `/profile`, which used a `pt-28` buffer I converted to `--site-header-h + 2rem`). Enable both slots, confirm cross-fade. Disable both, confirm no layout jump. Confirm hidden on `/admin/*` and `/auth`.
- **Phase 5 (size-wise stock):** set one size to 0 stock in admin, confirm it's disabled/struck-through on the product page and the "Add to Wardrobe" button shows "OUT OF STOCK" if that was the only available size. Add a size to cart at its current stock, drop that size to 0 in admin, reload `/cart` — confirm the line greys out and "Proceed to Checkout" is blocked. Try to force an order via a direct API call with an out-of-stock size and confirm `createOrder()`'s guard rejects it (`InsufficientStockError` → 409). Complete a real purchase and confirm both `product_sizes.stock` and the `products.stock` aggregate drop correctly. Drop a size below `lowStockThreshold` and confirm exactly one `email:low_stock` job fires (not one per admin save).
- **Phase 6 (brand feedback):** mark a test order `delivered` (via `/admin/orders`), confirm the feedback form appears on `/orders/[id]` (and didn't before). Submit a rating + comment, confirm a `brand_feedback` row lands with `isApproved = false`. Submit 6 times in an hour and confirm the 6th is rate-limited (429). Confirm `/admin/feedback` lists it and the Approve toggle flips `isApproved`.

## 3. Known gaps / deliberate deferrals (not bugs — called out during planning)

- **Low-stock alert accuracy on sized products:** `updateProduct()`'s edge-triggered low-stock email compares the client-sent `stock` value against the old DB value. When a product has sizes, `ProductForm` now sends a live-computed total (`sizesStockTotal`) so this should be accurate, but it was explicitly *not* rewired to fire off `setProductSizes()` itself — only `createOrder()`'s checkout-time decrement and admin-form saves trigger it. Worth a follow-up if alerts seem to under/over-fire in practice.
- **Payment-captured-but-order-rejected edge case (Phase 5):** `verify-payment` runs *after* Razorpay payment succeeds. If stock runs out in the narrow window between `priceCart()`'s pre-payment check and `createOrder()`'s guard, the customer's payment is captured but no order is created — they get a 409 telling them to contact support. This is a pre-existing architectural property of the payment flow (pay-then-create-order), not something introduced this session; a proper fix would mean holding/reserving stock during payment, which is out of scope for this rollout.
- **Public display of approved feedback:** `isApproved` is tracked and toggleable in admin, but nothing on the storefront reads it yet (no homepage testimonials section). Flagged as a natural follow-up phase if wanted.
- **`CollectionPageContent.tsx`'s "Add to Wardrobe" button** in the expanded overlay calls `incrementItems()`, which is a documented no-op in `cartStore.ts` — this predates this session and wasn't in scope to fix, but it means that specific button doesn't actually add anything to the cart. Worth flagging separately if it's a real bug vs. intentional legacy stub.

## 4. Environment note

Docker Desktop wasn't launchable from this session ("docker cannot be opened on this computer" per your message) and a stray Playwright/Chrome browser session was locked (~15 orphaned Chrome processes) — I didn't kill those since some could've been your own windows. Both blockers are on your side to clear before verification can happen.
