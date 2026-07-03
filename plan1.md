# NAAMI — Home Page CMS + Admin Dashboard Audit Fixes

## Context

Audit request: verify the home page is fully admin-manageable, verify all admin managers work and propagate changes, and suggest improvements for a premium shirts brand.

**Audit verdict:** The home page is largely CMS-driven (hero, hotspot banner + products, look cards + products, loom images/texts, coin pocket, manifesto, collections cards, featured products — all via `design_settings` / dedicated tables, all with proper Redis invalidation so changes go live instantly). The admin dashboard has correct auth on every route and a solid transactional-outbox email system. But the audit found **4 real bugs** and **4 manageability gaps**, fixed by tasks A–H below. A premium-feature roadmap follows at the end (not implemented in this plan).

Key audit findings driving this plan:
- **A.** Categories manager writes to an in-memory `Map` (`src/models/categoryStore.ts`) — never persists, never reaches the site. The real DB layer `src/db/queries/categories.ts` (table exists since migration 0000) is dead code.
- **B.** Product form sends `category` (free text); API reads `categoryId` — the field is silently dropped and always blank on edit.
- **C.** Tracking-number updates via `updateOrderAdminFields` send no customer email (only status changes do).
- **D.** Low-stock alerts fire only in `createOrder`, never when an admin edits stock.
- **E.** Section headers ("Seasonal Collections", "New Arrivals", "Bestsellers", "Shop The Look", loom panel labels) are hardcoded.
- **F.** Every footer link is a dead `href="#"`.
- **G.** Homepage collection cards have no click-through at all.
- **H.** Abandoned-cart reminder emails are fully built (`email:abandoned_cart` job + `reminderSentAt` column) but nothing ever enqueues them.

Environment notes: Next.js 16.2.6 (per AGENTS.md, consult `node_modules/next/dist/docs/` — routes use async `params: Promise<...>`; `useSearchParams` requires a `<Suspense>` boundary). Cache invalidation lives in the `src/db/queries/*` layer via `redisDel`. Jobs are drained by `POST /api/internal/process-jobs` (secret-guarded), polled every 30s by the PM2 worker `scripts/jobs-worker.mjs`.

---

## A. Rewire Categories manager to the database

Files: `src/app/api/admin/categories/route.ts`, `src/app/api/admin/categories/[id]/route.ts`, `src/app/admin/categories/page.tsx`; delete `src/models/categoryStore.ts`.

1. `route.ts`: swap import from `@/models/categoryStore` to `@/db/queries/categories` (`getAllCategories`, `createCategory`); `await` the calls (DB layer is async). Catch Postgres unique violation (code `23505` on slug) → 409 `{ error: "Slug already exists" }`.
2. `[id]/route.ts`: use `getCategoryById`, `updateCategory`, `deleteCategory` (note the DB layer name differs from the store's `getCategory`). In PUT, whitelist body to `{ name?, slug?, description? }` (arbitrary keys into Drizzle `.set()` throw); 400 on empty patch; same 23505 → 409.
3. `page.tsx:6`: replace the `Category` type import with a local type `{ id: number; name: string; slug: string; description: string | null; createdAt: string }`. Form shape already matches the DB layer — no other UI change.
4. Delete `src/models/categoryStore.ts`.

Cache invalidation already exists in the query layer (`redisDel(CACHE_KEYS.CATEGORIES_ALL)`). No migration — table exists.

**Verify:** CRUD a category in `/admin/categories`; restart dev server → data persists; seeded fake categories gone; soft-delete sets `deleted_at`.

## B. Product form: category select (depends on A)

File: `src/app/admin/products/page.tsx` only (APIs and `formatProduct` already handle `categoryId` correctly).

1. `Product` type: `category?: string` → `categoryId: number | null`. `FormData`: `category: string` → `categoryId: string` (`""` = none); update `emptyForm`.
2. Load categories from `GET /api/admin/categories` alongside `load()`.
3. Replace the free-text input (~line 233) with a `<select>`: "— None —" + one option per category (`value={c.id}`).
4. Edit hydration (~line 127): `categoryId: editing.categoryId != null ? String(editing.categoryId) : ""`.
5. Serialization (~line 149): send `categoryId: form.categoryId ? Number(form.categoryId) : null`; drop `category`.
6. Optional: "Category" column in the products table via name lookup.

**Verify:** create product with category → reopen edit modal shows it (was always blank); DB `category_id` set; "None" nulls it out.

## C. Tracking-update email for shipped orders

Files: `src/db/queries/orders.ts` (`updateOrderAdminFields`, ~:357–370), `src/lib/email.ts`.

1. Reuse the `email:order_status` job with pseudo-status `"tracking_updated"`: add to `STATUS_COPY` (email.ts:203) — heading "Tracking Updated"; widen the tracking-block condition (email.ts:238) to include `"tracking_updated"`.
2. Rework `updateOrderAdminFields` into a `db.transaction` mirroring `updateOrderStatus` (orders.ts:335–351): `SELECT ... FOR UPDATE`, apply update, then if `status === "shipped"` AND a tracking field actually changed (old vs new compare — this is the dedupe) AND new tracking number non-empty AND shipping email set → `enqueueJob("email:order_status", {..., toStatus: "tracking_updated", tracking}, tx)`. Shipping columns are encrypted — use `decryptOrderRow(order)` for `to`/`shippingName`, never the raw row.

**Verify:** ship an order, then PUT tracking (no `status`) → `jobs` row with `toStatus: "tracking_updated"`; worker sends email with tracking block. Re-PUT identical tracking → no job. Tracking on a `pending` order → no job.

## D. Low-stock alert on admin stock edit

File: `src/db/queries/products.ts` (`updateProduct`, ~:86–105).

1. Wrap in `db.transaction`: select old row `FOR UPDATE`, update, then when `data.stock !== undefined` and the value **crossed** the threshold (`updated.stock < updated.lowStockThreshold && old.stock >= old.lowStockThreshold` — `<` matches createOrder's `lt()` at orders.ts:222) → `enqueueJob("email:low_stock", { items: [{ name, number, stock, lowStockThreshold }] }, tx)` (same payload as orders.ts:226). Edge-trigger = dedupe. Keep `redisDel` after commit.

**Verify:** stock 10→3 (threshold 5) → one job; re-save → none; name-only edit at low stock → none; 10 then →4 → job again.

## E. Section headers into design_settings

Files: `src/db/queries/designSettings.ts`, `src/app/page.tsx`, `src/components/HomeClient.tsx`, `src/components/CollectionsShowcase.tsx`, `src/components/HotspotCards.tsx`, `src/components/LoomTimeline.tsx`, `src/app/admin/design/page.tsx`.

1. Add to `DEFAULT_DESIGN_SETTINGS` (defaults = current hardcoded strings; KV table, no migration):
   - `collections_kicker`, `collections_title`, `collections_title_accent`, `collections_side_note` (CollectionsShowcase.tsx:57–85)
   - `new_arrivals_tag/title/gateway_label`, `bestsellers_tag/title/gateway_label` (HomeClient.tsx:357–362, 385–391)
   - `shoplook_kicker`, `shoplook_title` (HotspotCards.tsx:106,117)
   - `loom_panel1_label`, `loom_panel2_label` (LoomTimeline.tsx:234,294)
2. `page.tsx`: build `collectionsHeader` / `newArrivalsSection` / `bestsellersSection` / `shopLookHeader` props; add `label` to `loomContent.panel1/panel2`.
3. `HomeClient.tsx`: extend props; `ProductCarousel` already takes `title/tag/gatewayLabel` as props — feed from settings. Pass header props down to `CollectionsShowcase` / `HotspotCards`; add `label` to `LoomTimelineContent` panels.
4. `admin/design/page.tsx`: new "Section Headers" section with its own save (existing `saveSettingsSubset` pattern; `bulkSetSettings` only touches submitted keys so per-section saves stay independent); add "Card Label" inputs to Loom panels 1–2 (`saveLoom` key list, ~:243–245).

**Verify:** edit each field in `/admin/design`, reload `/` → text updated (mutations `redisDel` immediately); untouched sections keep defaults.

## G. Collections showcase click-through (before F)

Files: `src/db/queries/home.ts`, `src/components/HomeClient.tsx`, `src/components/CollectionsShowcase.tsx`, `src/app/collection/page.tsx`, new `src/app/api/collections/[id]/route.ts`.

1. `home.ts:24`: include `id` in the collection mapping; add `id` to `HomepageCollection` (HomeClient.tsx:39) and `CollectionItem` (CollectionsShowcase.tsx:7).
2. `CollectionsShowcase.tsx`: wrap cards in `<Link href={/collection?collection=${id}}>` (or `router.push` to preserve gsap hover wrappers). Fallback cards link to `/collection`.
3. New public `src/app/api/collections/[id]/route.ts` (no auth): reuse `getCollectionById` + `getCollectionProductIds` from `src/db/queries/collections.ts` (already Redis-cached); 404 if missing/unpublished; return `{ id, name, tag, description, productIds }`.
4. `collection/page.tsx`: split into thin `page.tsx` rendering `<Suspense><CollectionPageInner/></Suspense>` (Next 16 `useSearchParams` requirement); inner reads `?collection` (fetch `/api/collections/{id}`, filter products by `productIds`, show name in hero) and `?filter` (preselect matching `FilterKey` tab).

**Verify:** homepage card → `/collection?collection=N` shows only that collection's products + name; invalid id falls back to all; `?filter=SHIRTS` preselects tab; `npm run build` passes (no missing-Suspense error).

## F. Fix dead footer links (after G — uses `?filter=`)

File: `src/components/EvanliteFooter.tsx` (`footerData`, :10–51). Don't make it admin-manageable — just fix hrefs.

1. Rewrite `footerData` to real destinations: `/collection` (+ `?filter=...` variants), `/about`, `/journal`, `/profile`, `mailto:` for contact/support; drop links with no real target (no `/orders` index or legal pages exist).
2. Use `next/link` `<Link>` for internal routes; keep `<a>` for mailto/external (Instagram).

**Verify:** click every footer link — no `#`, no 404s.

## H. Activate abandoned-cart reminders

Files: new `src/db/queries/abandonedCarts.ts`, `src/app/api/internal/process-jobs/route.ts`. Optional partial-index migration.

1. `enqueueDueCartReminders(olderThanHours)`: select carts `WHERE reminder_sent_at IS NULL AND updated_at < now() - interval` (use `updatedAt` — create-order refreshes the snapshot; don't email mid-checkout), `.limit(50)`. Per cart, one `db.transaction`: claim via `UPDATE ... SET reminder_sent_at = now() WHERE id = $id AND reminder_sent_at IS NULL RETURNING *`; only on a returned row, `enqueueJob("email:abandoned_cart", { to: row.email, items: JSON.parse(row.items) }, tx)`. Skip empty item arrays. Snapshot shape already matches the handler's `EmailItem` (jobs.ts:33,42) — no email changes.
2. `process-jobs/route.ts`: after auth, call `enqueueDueCartReminders(Number(process.env.ABANDONED_CART_REMINDER_HOURS ?? 6))` before `processJobs()`; include count in the JSON summary. The 30s PM2 worker makes scan + drain happen in one run — no new cron.
3. Optional: partial index `ON abandoned_carts (updated_at) WHERE reminder_sent_at IS NULL` via `db:generate`/`db:migrate`. Skippable — table is small.

**Verify:** backdate a cart 7h → one enqueued + emailed, `reminder_sent_at` set; second run → 0; completed checkout deletes the row → no reminder.

---

## Sequencing & global verification

A → B. C, D, H independent. E → G → F. After each group: `npm run lint` && `npm run build`. No required schema migrations (one optional index in H).

End-to-end check at the finish: run the app, walk `/admin` through categories/products/design/orders changes and confirm each appears on the public site immediately; trigger the three new emails via the worker.

---

## Roadmap (recommendations only — NOT in this plan's scope)

Prioritized for a premium shirts brand with premium packaging:

1. **Per-size inventory** — `product_sizes` currently has no quantity; stock is one pooled integer, so "M sold out, L available" is unrepresentable and sizes can oversell. Biggest apparel-specific gap.
2. **Product image gallery** — single `image`/`thumbnailImage`; premium apparel needs multiple angles + fabric macro shots. Needs a `product_images` table + PDP carousel + admin multi-upload.
3. **Shipping cost + GST breakdown** — checkout charges subtotal−discount only; invoices carry no GST/HSN lines (compliance gap in India). Add shipping rules (free-over-threshold) and tax lines to orders/invoices.
4. **Gift/premium packaging at checkout** — the brand promise, yet no gift-wrap tier, gift message, or gift receipt exists anywhere. Small schema + checkout + admin addition, high brand value.
5. **Product SEO** — PDP is `"use client"` with no `generateMetadata` or product JSON-LD; every product shares the root title.
6. **Saved addresses** — orders snapshot addresses; repeat customers re-type everything.
7. **Reviews/ratings**, **size-guide driven by product measurements**, **returns/exchange flow** (status enum has only `cancelled`), **legal pages** (privacy/terms/shipping/refund — also payment-gateway compliance), **low-stock scarcity badges on PDP**, **newsletter capture**, **richer analytics** (no InitiateCheckout event, no GA4).
