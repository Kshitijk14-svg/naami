# Admin CMS Overhaul — Separate Pages, Metafields, Multi-Image, Infinite Stock

## Context

The admin dashboard currently edits products, collections, categories, and orders inside a shared `CrudModal` on each list page. The product form is limited: fixed `material`/`fit`/`origin` text columns, sizes as one comma-separated text input, a bare stock number, and a single image with a manual-URL escape hatch. Meanwhile the public product API (`formatProduct` spread) leaks the entire product row — stock, low-stock threshold, publish/featured flags, timestamps — to any storefront visitor.

This change: (1) moves add/edit to dedicated admin pages, (2) adds an "infinite stock" toggle so admin can sell without inventory tracking, (3) makes sizes chip-style addable/deletable, (4) replaces material/fit/origin with generic per-product **metafields** (name + description), (5) supports up to **6 images per product** — multi-select upload preserving order, WebP compression to **400–800 KB**, drag-and-drop reorder, no manual URL entry (read-only URL display instead), and (6) hardens the public API so nothing admin-only leaks to customers.

**Next.js note (AGENTS.md):** this repo runs Next 16 — `params` is a Promise (`await params` in route handlers, `use(params)` in client pages, as `src/app/product/[id]/page.tsx` already does); middleware is `src/proxy.ts` whose `/admin/:path*` matcher already covers all new admin pages. Consult `node_modules/next/dist/docs/` if unsure.

---

## Phase 1 — Schema + migration

**Modify `src/db/schema.ts`:**
- `products`: add `trackStock: boolean("track_stock").notNull().default(true)` (toggle OFF ⇒ infinite stock; default preserves current behavior). **Remove** `material`, `fit`, `origin` columns. Keep `image`/`thumbnailImage` (denormalized main image, synced from gallery position 0) and `stock`/`lowStockThreshold`.
- New table `product_metafields`: `id serial PK`, `productId` int FK → products (cascade), `name varchar(100) NOT NULL`, `description text NOT NULL default ''`, `sortOrder int NOT NULL default 0`, index on `productId`.
- New table `product_images`: `id serial PK`, `productId` int FK → products (cascade), `url text NOT NULL`, `thumbnailUrl text`, `sortOrder int NOT NULL default 0`, `sizeBytes int`, index on `(productId, sortOrder)`.

**Migration:** `npm run db:generate` → `src/db/migrations/0007_*.sql`, then **hand-edit** to place data-migration SQL between the CREATE/ADD statements and the DROP COLUMN statements (each separated by `--> statement-breakpoint`):

```sql
INSERT INTO "product_metafields" ("product_id","name","description","sort_order")
  SELECT "id", 'Material', "material", 0 FROM "products" WHERE COALESCE("material",'') <> '';
--> statement-breakpoint
-- same for fit → 'Fit' (sort 1), origin → 'Origin' (sort 2)
--> statement-breakpoint
INSERT INTO "product_images" ("product_id","url","thumbnail_url","sort_order")
  SELECT "id","image","thumbnail_image",0 FROM "products" WHERE "deleted_at" IS NULL;
```
(Migrated metafields use plain names Material/Fit/Origin; storefront labels change accordingly. Admin can rename later.)
Then `npm run db:migrate`.

**Rationale for keeping `products.image`:** `wishlist.ts`, `homepageContent.ts`, `searchProducts`, cart snapshots, and seed all read it; `setProductImages` keeps it in sync from gallery[0] in one code path, so `product_images` stays the source of truth without rewriting 6+ join sites.

## Phase 2 — Query layer

**`src/db/queries/products.ts`:**
- Types: `ProductMetafield = { name: string; description: string }`, `ProductImage = { url: string; thumbnailUrl: string | null }`.
- `getProductMetafields(id)` / `getProductMetafieldsBatch(ids)` and `getProductImages(id)` / `getProductImagesBatch(ids)` — mirror existing `getProductSizes`/`Batch` (order by `sortOrder`, same caching approach).
- `setProductMetafields(productId, metafields)` — exact mirror of `setProductSizes` (tx, `FOR UPDATE` lock, delete-all, reinsert with `sortOrder = index`).
- `setProductImages(productId, images)` — same tx pattern, **plus** inside the tx update `products.image`/`thumbnailImage` from `images[0]` (fallback to the default placeholder when empty). Returns the removed `{url, thumbnailUrl}` pairs so the API route can unlink files. Clears the same Redis keys `updateProduct` clears.
- `updateProduct` low-stock edge trigger: only fire when `row.trackStock` is true.
- `searchProducts`: replace the `products.material ILIKE` clause with an `EXISTS` subquery against `product_metafields` (name/description ILIKE).
- New `projectPublicProduct(p, { sizes, images, metafields })` returning ONLY: `id, number, name, subtitle, priceInr, price, image, thumbnailImage, categoryId, sizes, images, metafields`. Explicitly excludes `stock`, `lowStockThreshold`, `trackStock`, `isPublished`, featured flags, `homeSortOrder`, timestamps. `formatProduct` (full spread) becomes admin-only.

**`src/db/queries/orders.ts` `createOrder`:**
- Add `trackStock` to the `FOR UPDATE` locked select (~line 127); skip the stock decrement (~line 176) for items whose product has `trackStock = false`; add `eq(products.trackStock, true)` to the low-stock alert query (~line 211).

**`src/db/queries/home.ts`:** switch to `projectPublicProduct` + fetch images/metafields batches so home payloads carry them (carousel quick-view renders spec rows).

## Phase 3 — APIs

**`src/lib/imageProcessing.ts`:** `FULL_IMAGE_MIN_BYTES = 400 * 1024`, `FULL_IMAGE_MAX_BYTES = 800 * 1024` (lines 7–8). Pipeline (max edge 1920, WebP quality binary search, 480px thumbnail) otherwise unchanged. Upload route stays single-file; the client loops.

**`src/app/api/admin/products/route.ts` POST:** drop material/fit/origin; accept `trackStock ?? true`; validate `images.length <= 6` (400 otherwise) and metafields (non-empty name ≤ 100 chars); after create call `setProductImages` + `setProductMetafields`. Respond with full admin shape `{ ...formatProduct(p), sizes, metafields, images }`.

**`src/app/api/admin/products/[id]/route.ts`:**
- GET: include `sizes, metafields, images`.
- PUT: drop material/fit/origin mappings; handle `trackStock`, `metafields`, `images` (max-6 check). Using `setProductImages`' removed list, best-effort `fs.unlink` both full and thumb files — only after verifying the resolved path stays inside `public/images/products/` (path-traversal guard); ignore unlink errors.
- DELETE unchanged (soft delete).

**Public routes — closes the leak:**
- `src/app/api/products/route.ts` and `src/app/api/products/[id]/route.ts`: return `projectPublicProduct(...)` with sizes/images/metafields batches instead of `formatProduct` spread.
- `/api/search`, `/api/collections/[id]`: already explicitly projected — no change.

All new behavior lives in existing `verifyAdminRequest`-gated routes (`["admin","super_admin"]`); no new API routes needed.

## Phase 4 — Admin UI

**Shared extraction — `src/components/admin/formFields.tsx`:** move the `field()` helper + input styles currently duplicated per page; reuse in all forms. Keep the atelier palette (cream `#F4F0E6`/`#EDE8DC`, ink `#111`, deep red `#8B1A1A`) and inline-style idiom.

**New components (all `"use client"`):**
- `SizeChipsField.tsx` — chips with `×` delete; text input + Add/Enter; trim, dedupe, max length 10 (DB `varchar(10)`).
- `MetafieldsField.tsx` — one row per metafield: name input + description input + Remove button; "+ Add metafield" appends a row. Order = array order.
- `ProductImagesField.tsx` — `<input type="file" multiple accept="image/*">`; rejects when existing + selected > 6; uploads **sequentially** in selection order (per-file POST to `/api/admin/upload`, progress text "Uploading 2 of 4…") — sequential keeps sharp single-threaded on the low-core VPS and preserves order. Card grid per image: thumbnail preview, "MAIN" badge on index 0, **read-only URL** (`<input readOnly>`), Remove button (local state; persisted + file-unlinked on Save). Reorder via **native HTML5 DnD** (`draggable`, `onDragStart`/`onDragOver`/`onDrop` splice-reinsert) — no new dependency.
- `ProductForm.tsx` — `({ productId }: { productId?: number })`; loads categories, and the product via `GET /api/admin/products/{id}` when editing. Fields: number, name, subtitle, priceINR, category select, **stock number input (disabled when infinite)** + **"Infinite stock — sell without tracking inventory" toggle** (`trackStock = !toggled`), lowStockThreshold, `SizeChipsField`, `MetafieldsField`, `ProductImagesField`, publish/featured checkboxes, homeSortOrder. Submit → POST/PUT then `router.push("/admin/products")`; Cancel link back.
- `CollectionForm.tsx`, `CategoryForm.tsx` — same pattern, JSX moved from the current pages (collection keeps single-image `ImageUploadField`).

**New pages (thin wrappers; edit pages unwrap `params` with `use()`):**
- `src/app/admin/products/new/page.tsx`, `src/app/admin/products/[id]/edit/page.tsx`
- `src/app/admin/collections/new/page.tsx`, `src/app/admin/collections/[id]/edit/page.tsx`
- `src/app/admin/categories/new/page.tsx`, `src/app/admin/categories/[id]/edit/page.tsx`
- `src/app/admin/orders/[id]/page.tsx` — move the entire order modal body (`src/app/admin/orders/page.tsx` lines ~228–381: customer block, items, `ORDER_TRANSITIONS` status select + note, tracking, admin notes, invoice send/download, history timeline) into this page; stays on page after save and refreshes.

**List page refactors (products, collections, categories, orders):** remove modal/form state and `CrudModal` usage; `onAdd`/`onEdit` become `router.push` to the new routes (orders → `/admin/orders/{id}`). Keep `CrudTable` and its delete confirm. Products list stock column renders `p.trackStock ? p.stock : "∞"`. **Keep `CrudModal.tsx`** — the coupons page still uses it.

**`ImageUploadField.tsx`:** delete the manual URL text input; show the uploaded image's URL read-only instead. Update remaining callers (collection form, design page, look cards).

## Phase 5 — Storefront

- **`src/app/product/[id]/page.tsx`:** product type gains `images[]` + `metafields[]`, loses material/fit/origin. Gallery: `images` (fallback `[{url: image}]`), main `<Image>` + thumbnail strip below when >1 image (deep-red border on active, matching existing style). Spec block renders `metafields.map(m => row(m.name, m.description))` instead of the fixed 3 rows. Add-to-cart keeps using the main image URL — cart store unchanged.
- **`src/components/ProductCarousel.tsx`** (spec rows ~765–767) and **`src/components/CollectionPageContent.tsx`** (~302–304): render `metafields.slice(0, 3)` instead of material/fit/origin; update inline types.
- **`src/components/HomeClient.tsx`** + `src/models/products.ts` `CarouselProduct`: replace the three string fields with `metafields`; convert static fallback data mechanically.
- Note: branch `feat/cms-admin-fixes` has uncommitted edits to `HomeClient.tsx`, `CollectionsShowcase.tsx`, `CollectionPageContent.tsx`, `src/app/api/collections/` — build on top of them, do not revert.

## Phase 6 — Security sweep (nothing leaks out of admin)

- Public `GET /api/products` and `/api/products/[id]` now emit only the `projectPublicProduct` shape — verify no `stock`, `lowStockThreshold`, `trackStock`, `isPublished`, featured flags, `homeSortOrder`, or timestamps in the JSON.
- New admin pages are under `/admin/:path*` → already guarded by `src/proxy.ts` (redirects non-staff/admin) + `AdminShell` client guard; all admin API handlers already call `verifyAdminRequest`. No gaps introduced; no proxy change needed.
- Metafields and image URLs are customer-visible by design (they render on the product page).

## Phase 7 — Ripple cleanup

- **`src/db/seed.ts`:** drop material/fit/origin keys (TS will flag); insert metafields + one `product_images` row per seeded product.
- `src/db/backfill-thumbnails.ts`, wishlist/homepageContent queries, email/invoice templates: unaffected (`products.image` kept).
- Low-stock email copy: unchanged (alerts simply never fire for infinite-stock products).

## Verification

1. `npm run db:generate` → single 0007 migration; hand-edit data SQL; `npm run db:migrate`; spot-check via `npm run db:studio`: metafields rows exist per product, one `product_images` row each, `track_stock = true`, material/fit/origin columns gone.
2. `npm run build` + `npm run lint` — build surfaces every stale material/fit/origin reference.
3. Manual flows (dev server, admin login; Playwright MCP available):
   - Products list "+ Add" → `/admin/products/new`; create a product with 3 multi-selected images (order preserved), add size "XXL" / delete "S" via chips, add 2 metafields, toggle infinite stock → stock input disables; save → list shows "∞".
   - Edit page: drag image 3 to position 1 → save → storefront main image changes; thumbnail strip shows all; URLs read-only; removed image's files gone from `public/images/products/`.
   - Upload a 7th image → blocked client-side; direct API PUT with 7 images → 400.
   - Order an infinite-stock product → stock unchanged, no `email:low_stock` job row; a tracked product still decrements and alerts below threshold.
   - `/admin/orders` → order detail page: status transition + note, tracking save, invoice send/download, history renders.
   - Collections/categories new+edit pages work; coupons page (still modal) unaffected.
   - Uploaded images land as `.webp` in 400–800 KB.
4. Leak check: `curl /api/products/1 | jq 'keys'` → no stock/threshold/flags/timestamps; same for the list endpoint.
5. Storefront regression: home carousels, search dropdown, collection page, cart → checkout end-to-end.

## Critical files

| Action | Files |
|---|---|
| Modify | `src/db/schema.ts`, `src/db/queries/products.ts`, `src/db/queries/orders.ts`, `src/db/queries/home.ts`, `src/lib/imageProcessing.ts`, `src/app/api/admin/products/route.ts`, `src/app/api/admin/products/[id]/route.ts`, `src/app/api/products/route.ts`, `src/app/api/products/[id]/route.ts`, `src/app/admin/{products,collections,categories,orders}/page.tsx`, `src/components/admin/ImageUploadField.tsx`, `src/app/product/[id]/page.tsx`, `src/components/ProductCarousel.tsx`, `src/components/CollectionPageContent.tsx`, `src/components/HomeClient.tsx`, `src/db/seed.ts` |
| New | migration `0007_*.sql`, `src/components/admin/{formFields,SizeChipsField,MetafieldsField,ProductImagesField,ProductForm,CollectionForm,CategoryForm}.tsx`, `src/app/admin/products/{new,[id]/edit}/page.tsx`, same for collections + categories, `src/app/admin/orders/[id]/page.tsx` |
