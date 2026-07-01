# Profile page, admin nav, and dynamic storefront

## Context
Four related asks:
1. Replace the "Sign In" navbar link with a **Profile** button once logged in, leading to a profile page with **order history**, **wishlist**, and profile info.
2. Show an **Admin Dashboard** button for `super_admin`/`admin`/`staff` roles.
3. Add a **Home** button inside the admin dashboard so staff/admin can get back to the public site without signing out.
4. Make the home page's products/collections **dynamic**, reflecting what's added in the admin dashboard, instead of hardcoded.

Investigation found #2 is already mostly built (`src/components/ProfileDropdown.tsx:98-113` already shows an "Admin Dashboard" link for admin roles), and the admin shell already has an implicit way back to the site (the "Naami" wordmark links to `/` in `AdminTopbar.tsx`) — but nothing explicit, and no `/profile` page exists yet.

For #4, investigation surfaced a bigger pre-existing gap than what was described: it's not just the home page — `/api/products`, `/api/search`, and `src/app/product/[id]/page.tsx` are **all** still wired to a dead in-memory store (`src/models/productStore.ts`) seeded from a hardcoded 17-product array (`src/models/products.ts`), completely bypassing the real Postgres `products`/`collections` tables that the admin CRUD (`src/db/queries/products.ts`, `collections.ts`) already writes to. User confirmed (via question) to fix the whole chain, not just the home page — otherwise a product added in admin would show on the home page but 404 when clicked.

Wishlist doesn't exist at all yet (no schema, no API, no UI) and needs to be built from scratch. User confirmed (via question) that customers should be able to add to wishlist both from `ProductCarousel` cards and the product detail page, not just the detail page.

## Part 1 — Reconnect the storefront to the real database (foundation for everything else)
Today `CarouselProduct` (`src/models/products.ts`) is the shape every product-facing component expects: `{id, number, name, subtitle, price, priceInr, material, fit, origin, image, sizes?}`. `formatProduct()` in `src/db/queries/products.ts` already produces the DB-row equivalent (`{...row, price: formatINR(row.priceInr)}`); just need to also attach `sizes` (via `getProductSizes`).

- **`src/app/api/products/route.ts`**: replace `getAllProducts()` from `@/models/productStore` with `getPublishedProducts()` + `formatProduct()` from `@/db/queries/products`, attaching sizes per product.
- **`src/app/api/products/[id]/route.ts`** (new): public single-product GET, `getProductById(id)` + `formatProduct` + `getProductSizes`. 404 if not found or not published.
- **`src/app/api/search/route.ts`**: replace `getAllProducts()` filtering with the already-existing-but-unused `searchProducts()` from `@/db/queries/products` (it needs a `price` display field added — currently returns `priceInr` only; add `price: formatINR(priceInr)` to match what the search UI likely expects).
- **`src/app/product/[id]/page.tsx`**: replace `allProducts.find(...)` (static import) with a `useEffect` fetch to `/api/products/[id]` (same pattern as the hero's `/api/public/design-settings` fetch in `src/app/page.tsx`), keep the existing "Product not found" branch for the 404 case.
- **`src/app/collection/page.tsx`**: no change needed — it already fetches `/api/products` and is agnostic to the backend, so fixing the route above fixes this page automatically.

No changes needed to cart/checkout — `useCartStore.addItem` and `createOrder` (`src/db/queries/orders.ts`) already operate generically on `productId`, so once real DB ids flow through the pages above, checkout keeps working unmodified.

## Part 2 — Dynamic home page (New Arrivals, Bestsellers, Collections)
Admin curates what shows via explicit flags (not auto-computed from sales — matches "changed when the collection or product is added from admin dashboard").

- **Schema** (`src/db/schema.ts`): add to `products` — `isFeaturedNewArrival: boolean default false`, `isFeaturedBestseller: boolean default false`, `homeSortOrder: integer default 0`. Add to `collections` — `showOnHomepage: boolean default false`, `homeSortOrder: integer default 0`. Generate + apply migration (`npm run db:generate`, `npm run db:migrate`).
- **Queries**: `getFeaturedNewArrivals()` / `getFeaturedBestsellers()` in `src/db/queries/products.ts` (published, not deleted, respective flag, ordered by `homeSortOrder`), `getHomepageCollections()` in `src/db/queries/collections.ts` (published, `showOnHomepage`, ordered by `homeSortOrder`, limit 3 to match the existing 2-portrait+1-landscape layout). Add matching `CACHE_KEYS`/`CACHE_TTL` entries in `src/lib/cache.ts` and invalidate them in the relevant `create*`/`update*`/`delete*` functions (mirrors the existing `redisDel` calls already in those files).
- **New route**: `src/app/api/public/home-content/route.ts` returning `{ newArrivals, bestsellers, collections }`, each product shaped as `CarouselProduct` (via `formatProduct` + sizes) and collections shaped as `{number, name, tag, description, image}`.
- **`src/app/page.tsx`**: drop the static `import { newArrivals, bestsellers } from "@/models/products"`; fetch `/api/public/home-content` in a `useEffect` (same fallback pattern already used for hero slides — keep the current static arrays as initial state so there's no empty flash before the fetch resolves), pass results to `ProductCarousel` and `CollectionsShowcase`.
- **`src/components/CollectionsShowcase.tsx`**: currently takes no props and hardcodes 3 `PortraitCollectionCard`/`LandscapeCollectionCard` instances. Add a `collections: {number,name,tag,description,image}[]` prop; render the first 2 as Portrait cards (existing 6+6 grid row) and the rest as Landscape cards (existing full-width row) via `.map()`, preserving current visual layout for up to 3 items.
- **Admin UI**: `src/app/admin/products/page.tsx` — add "Featured: New Arrival" / "Featured: Bestseller" checkboxes + a sort-order number input to the form (same `field()`/checkbox pattern already used for `isPublished`). `src/app/admin/collections/page.tsx` — add "Show on Homepage" checkbox + sort-order input, mirroring the products page pattern. Both `src/app/api/admin/products/[id]/route.ts` / `.../route.ts` and the collections equivalents need the new fields passed through to `createProduct`/`updateProduct`/`createCollection`/`updateCollection` (all already accept partial data objects, so this is additive).

## Part 3 — Profile page + navbar
- **`src/components/ProfileDropdown.tsx`**: add a "My Profile" link (same styling as the existing "Admin Dashboard" link at lines 98-113) pointing to `/profile`, visible to every authenticated role, placed above the role-gated Admin Dashboard link.
- **`src/app/profile/page.tsx`** (new): client component, auth-gated the same way `AdminShell.tsx` gates admin pages (fetch `/api/auth/me`, redirect to `/auth` if not authenticated). Three tabs using the same tab-switcher visual pattern as `AuthForm.tsx`:
  - **Profile**: display name/email/role (read-only — no edit form, not requested).
  - **Order History**: fetch `GET /api/orders` (new, see Part 4), list orders (id, status, date, total) linking each to the existing `/orders/[id]` confirmation page.
  - **Wishlist**: fetch `GET /api/wishlist` (new, see Part 5), show saved products with a remove action, linking to `/product/[id]`.

## Part 4 — Order history backend
- **`src/db/queries/orders.ts`**: add `getOrdersByUserId(userId: number)`, mirroring `getAllOrders()` but filtered `eq(orders.userId, userId)`, ordered `desc(orders.createdAt)`, passed through `decryptOrderRow`.
- **`src/app/api/orders/route.ts`** (new): `GET`, auth via `verifyAdminRequest(request, ["customer","staff","admin","super_admin"])` (same helper `src/app/api/orders/[id]/route.ts` already uses), resolve the user via `getUserByEmail(auth.email)`, return `getOrdersByUserId(user.id)`.

## Part 5 — Wishlist (new feature)
- **Schema** (`src/db/schema.ts`): new `wishlists` table — `id serial PK`, `userId integer` FK→`users.id` (cascade), `productId integer` FK→`products.id` (cascade), `createdAt`. Unique index on `(userId, productId)`. Include in the same migration as Part 2.
- **`src/db/queries/wishlist.ts`** (new): `getWishlistByUserId(userId)` (join `products` for display data), `addToWishlist(userId, productId)`, `removeFromWishlist(userId, productId)`.
- **API** (new): `src/app/api/wishlist/route.ts` — `GET` (list current user's wishlist) and `POST` (add, body `{productId}`); `src/app/api/wishlist/[productId]/route.ts` — `DELETE` (remove). All authenticated via the `naami_session` cookie (same JWT pattern as `/api/orders`), operating only on the session's own `userId` — never trust a client-supplied user id, avoiding IDOR.
- **Client state**: `src/models/wishlistStore.ts` (new) — small Zustand store (same pattern as `src/models/cartStore.ts`, but no `persist` — it's server-backed) holding a `Set<number>` of wishlisted product ids, with `load()` (calls `GET /api/wishlist` once) and `toggle(productId)` (calls POST/DELETE, updates the set optimistically).
- **UI hookup**:
  - `src/components/WishlistButton.tsx` (new): small reusable heart-icon toggle button, reads/writes the Zustand store; if not authenticated, clicking redirects to `/auth`.
  - `src/components/ProductCarousel.tsx`: add `<WishlistButton>` inside the card's image container (~line 612-654, alongside the existing corner-rivet accent div), `stopPropagation` on click so it doesn't also trigger the card's expand-to-detail handler.
  - `src/app/product/[id]/page.tsx`: add `<WishlistButton>` near the existing "Add to Cart" action.

## Part 6 — Admin "Home" button
- **`src/components/admin/AdminTopbar.tsx`**: add an explicit "View Site" link (plain `<Link href="/">`, same styling family as the "Sign Out" button next to it) — the brand wordmark already does this implicitly, but the user asked for it explicitly, so make it a labeled action rather than relying on the logo.

## Files touched (summary)
- Schema/migration: `src/db/schema.ts`, generated migration files, `src/lib/cache.ts`
- Queries: `src/db/queries/products.ts`, `collections.ts`, `orders.ts`, new `src/db/queries/wishlist.ts`
- Public API: `src/app/api/products/route.ts`, new `src/app/api/products/[id]/route.ts`, `src/app/api/search/route.ts`, new `src/app/api/public/home-content/route.ts`, new `src/app/api/orders/route.ts`, new `src/app/api/wishlist/route.ts` + `[productId]/route.ts`
- Admin API: `src/app/api/admin/products/route.ts` + `[id]/route.ts`, `src/app/api/admin/collections/route.ts` + `[id]/route.ts` (pass through new fields)
- Pages: `src/app/page.tsx`, `src/app/product/[id]/page.tsx`, new `src/app/profile/page.tsx`, `src/app/admin/products/page.tsx`, `src/app/admin/collections/page.tsx`
- Components: `src/components/CollectionsShowcase.tsx`, `src/components/ProductCarousel.tsx`, `src/components/ProfileDropdown.tsx`, `src/components/admin/AdminTopbar.tsx`, new `src/components/WishlistButton.tsx`
- State: new `src/models/wishlistStore.ts`

## Verification
1. `npx tsc --noEmit` after each part to catch type drift (the codebase already has some pre-existing type mismatches around `Product`/`priceINR` vs `priceInr` — don't let new code inherit that, use the DB's camelCase consistently).
2. `npm run db:generate && npm run db:migrate` after schema changes; confirm new columns/table via a read-only `SELECT` against the local Postgres.
3. Log in as `kshitijmay14@gmail.com` (super_admin) via the running dev server:
   - Confirm "My Profile" appears in the dropdown and `/profile` loads all 3 tabs.
   - Confirm "Admin Dashboard" link still works, and the new "View Site" button in the admin topbar returns to `/` without signing out.
   - In `/admin/products`, create a new product, flag it "Featured: New Arrival", confirm it appears on the home page carousel, click through to `/product/[id]` and confirm it loads (not a 404), add it to cart and to wishlist, confirm it appears in `/profile`'s Wishlist tab.
   - In `/admin/collections`, create a collection with "Show on Homepage" checked, confirm it renders in the home page Collections section.
   - Place a test order end-to-end, confirm it shows up in `/profile`'s Order History tab.
   - Search for the new product via the navbar search, confirm it's found.
4. Clean up any test product/collection/order created during verification.
