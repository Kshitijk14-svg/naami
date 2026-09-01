# Known Issues

Defects found during the code review that produced this test suite. **They are
already logged — do not spend testing time rediscovering them.**

Cases in the checklists that reproduce one of these are marked `⚠ KNOWN` and
reference the `KI-` id here.

No application code was changed while writing this suite. Every entry below
includes a suggested fix, but the decision to act is yours.

**Status: 42 open.** S1 ×4 · S2 ×9 · S3 ×22 · S4 ×7

---

## Regressions introduced by the security hardening (`31bd012`)

These three came from the hardening pass itself and are called out separately
because they are corrections to recent work rather than pre-existing debt.

### KI-001 · S2 · Login and OTP-verify rate limits are still bypassable

`src/app/api/auth/login/route.ts:26`, `src/app/api/auth/verify-otp/route.ts:28`

Both routes read the **first** `X-Forwarded-For` entry:

```js
const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
```

That is the exact pattern `src/lib/requestIp.ts:5-13` was written to eliminate —
nginx *appends* with `proxy_add_x_forwarded_for`, so the first entry is whatever
the client sent. `send-otp` and `apply-coupon` were migrated to the hardened
helper; these two were missed.

**Effect:** the two limiters that matter most — password brute-force (10 per
5 min) and OTP-verify (10 per 5 min) — can be defeated by rotating the header.

**Repro:** `[LOCAL-ONLY]` `security/45-rate-limits.md` → TC-SEC-RL-002.

**Suggested fix:** `import { rateLimitKey } from "@/lib/requestIp"` and use
`rateLimitKey(request)` in both, as `cart/availability` already does.

---

### KI-002 · S3 · Journal posts can no longer contain HTML

`src/app/journal/[slug]/page.tsx:16-24`

The admin editor labels the field **`Content * (HTML or plain text)`**
(`src/app/admin/blog/page.tsx:230`), so HTML was an intended feature. The XSS fix
replaced raw interpolation with `toParagraphHtml`, which escapes `& < > " '`
before adding `<br/>`.

**Effect:** the stored-XSS hole is genuinely closed, but no images, links,
headings, bold or lists render in any post body — an admin writing
`<strong>bold</strong>` sees the tags as visible text.

**Repro:** `customer/11-journal-about.md` → TC-JRN-008.

**Suggested fix:** allowlist sanitisation instead of escaping — permit
`p strong em a ul ol li h2 h3 br`, strip `<script>`, all `on*` attributes and
`javascript:` URLs. Then either keep the `\n → <br/>` step for plain-text posts or
drop it once bodies are authored as HTML.

Related: the wrapper carries `className="prose-naami"` (`:119`) but **that class is
not defined in `globals.css`** — it does nothing.

---

### KI-003 · S3 · The cart over-reports stock during checkout

`src/db/queries/reservations.ts:307`, `src/app/api/cart/availability/route.ts`

`availableStock()` computes on-hand stock minus active holds, and its own docstring
says it "Backs the cart availability endpoint so the storefront does not advertise
units that are already spoken for."

**It has no callers.** `/api/cart/availability` reads raw `products.stock` /
`product_sizes.stock` instead.

**Effect:** while another shopper holds the last unit in a 15-minute checkout
intent, the cart still shows it as available. The buyer only discovers otherwise at
create-order, with a 409.

**Repro:** `[LOCAL-ONLY]` `customer/06-cart.md` → TC-CART-021.

**Suggested fix:** call `availableStock(productIds)` in the route and subtract
holds before building the response.

---

## S1 — Critical

### KI-004 · S1 · Password reset is a full account-takeover path

`src/app/api/auth/send-otp/route.ts`, `src/app/api/auth/verify-otp/route.ts:89`,
`src/db/queries/users.ts:47-75`

`send-otp` with `purpose: "reset"` mails a 6-digit code to any existing address,
and `verify-otp` then **overwrites `passwordHash`** with no proof of prior
ownership beyond that code. It works against `admin` and `super_admin` accounts.

Additionally, if the account named by `SUPER_ADMIN_EMAIL` **does not yet exist**,
whoever controls that mailbox creates a `super_admin` by signing up
(`src/models/roles.ts:8-12`).

**Effect:** mailbox security is the *only* control protecting every account
including the super-admin. Anyone who can read the mailbox — or intercept the
OTP — owns the account.

**Repro:** `security/41-auth-session.md` → TC-SEC-AUTH-014.

**Suggested fix:** require the current password for a signed-in password change;
for a genuine reset, use a single-use signed token rather than a 6-digit numeric
code, and notify the account holder on every password change.

---

### KI-005 · S1 · Video upload writes a client-controlled file extension under `public/`

`src/app/api/admin/upload-video/route.ts:53`

```js
const ext = path.extname(file.name) || ".mp4";
```

The uploaded file is written unmodified to `public/videos/moments/` with the
extension the client chose. There is no server-side MIME or extension allowlist —
only ffprobe's "is this decodable as video" check.

**Effect:** an admin (or anyone who obtains admin access) can upload a polyglot —
a valid MP4 with HTML appended — named `evil.html`, then serve it from your own
origin. Same-origin HTML means session cookie access.

**Repro:** `security/47-uploads-security.md` → TC-SEC-UP-004.

**Suggested fix:** derive the extension from the ffprobe-detected container, not
the filename. Allowlist `.mp4 .webm .mov`.

---

### KI-006 · S1 · A staff account can read any customer's orders and PII

`src/app/api/admin/orders/route.ts`, `src/db/queries/orders.ts:615-618`

`GET /api/admin/orders` allows `["staff","admin","super_admin"]` and passes `q`
straight into `ILIKE '%q%'` against `orders.id` and `orders.shippingEmail`, with
**no pagination and no result cap**. `q=%` returns every order in the system with
decrypted phone and address.

Staff also bypass the ownership check on the *customer* order routes
(`src/app/api/orders/[id]/route.ts:27` guards only `role === "customer"`), so a
staff account can pull any order's items and invoice PDF too.

**Effect:** the lowest privileged role has unrestricted access to all customer PII.

**Repro:** `security/42-access-control.md` → TC-SEC-AC-011.

**Suggested fix:** paginate, cap results, escape `%` and `_` in `q`, and decide
deliberately whether staff should see decrypted PII at all.

---

### KI-007 · S1 · `/api/health/ready` discloses infrastructure topology to anyone

`src/app/api/health/ready/route.ts:38-60`

Unauthenticated. Returns primary DB, replica DB and Redis reachability plus
circuit-breaker states (`CLOSED` / `OPEN` / `HALF_OPEN`).

**Effect:** an attacker learns whether you run a replica, whether Redis is up —
and therefore **whether rate limiting is currently failing open**.

**Repro:** `security/46-headers-transport.md` → TC-SEC-HDR-009.

**Suggested fix:** require the `JOBS_WORKER_SECRET` (as `process-jobs` does), or
restrict it to localhost in nginx and let the monitor hit it over the loopback.

---

## S2 — Major

### KI-008 · S2 · Checkout fields lose focus after every keystroke

`src/app/checkout/page.tsx:197-211`

`LabeledInput` is declared **inside** the `CheckoutPage` function body, so it is a
new component type on every render. Each keystroke calls `setForm` → re-render →
React unmounts and remounts the `<input>`.

**Effect:** typing into any of the 8 checkout fields drops focus after each
character. This is the single most damaging defect in the customer journey.

**Repro:** `customer/07-checkout.md` → TC-CHK-002.

**Suggested fix:** move `LabeledInput` to module scope, outside the component.

---

### KI-009 · S2 · Cancelling the Razorpay modal is completely silent

`src/app/checkout/page.tsx:179`

`modal.ondismiss` calls `setProcessing(false)` and nothing else.

**Effect:** a customer who closes or cancels the payment popup is returned to the
form with no message and no explanation. Their stock is still held by the checkout
intent for 15 minutes.

**Repro:** `customer/07-checkout.md` → TC-CHK-019.

**Suggested fix:** show "Payment cancelled — your cart is unchanged" and surface
the hold expiry.

---

### KI-010 · S2 · A logged-out user is told only "Unauthorized" at checkout

`src/app/checkout/page.tsx:128`

`/checkout` is **not** in the proxy matcher (`src/proxy.ts:69`), so a signed-out
visitor can reach it, fill in all 8 fields, click Pay, and receive the bare string
`Unauthorized` from `create-order` — with no sign-in prompt and no redirect.

**Repro:** `customer/07-checkout.md` → TC-CHK-021.

**Suggested fix:** add `/checkout` to the proxy matcher, or intercept 401 in
`handlePay` and redirect to `/auth?from=/checkout`.

---

### KI-011 · S2 · Hard-refreshing `/checkout` can bounce a full cart to `/cart`

`src/app/checkout/page.tsx:63-65`

The empty-cart guard runs in a `useEffect` on mount, but zustand `persist`
rehydrates `localStorage` **after** first paint — so `cartItemsCount` is 0 on that
frame.

**Repro:** `customer/07-checkout.md` → TC-CHK-001.

**Suggested fix:** gate the redirect on `useCartStore.persist.hasHydrated()`.

---

### KI-012 · S2 · Staff hitting an admin page directly get a crash, not a redirect

`src/app/admin/layout.tsx:13`, `src/app/admin/products/page.tsx:36`

The admin layout admits `["staff","admin","super_admin"]`, and the sidebar merely
*hides* the links staff cannot use. A staff user who types `/admin/products` gets
the shell; the API returns **403**; the client does `r.json()` on the error body
and then `.map`s over `{error:"Forbidden"}`.

Same shape on `/admin/analytics`, `/admin/coupons`, `/admin/blog`,
`/admin/categories`, `/admin/collections`, `/admin/feedback`, `/admin/design`.

**Repro:** `admin/20-access-roles.md` → TC-ADM-ACC-007.

**Suggested fix:** role-gate each admin page server-side, or handle non-ok
responses before setting state.

---

### KI-013 · S2 · An empty Price field passes validation and breaks the insert

`src/app/api/admin/products/route.ts:64-68`

```js
typeof priceInr !== "number"
```

`Number("")` is `NaN`, and `typeof NaN === "number"` — so a blank Price passes the
guard and reaches the database.

**Repro:** `admin/22-products.md` → TC-ADM-PRD-011.

**Suggested fix:** `!Number.isFinite(priceInr) || priceInr < 0`. Apply the same to
`stock`, which has the identical hole.

---

### KI-014 · S2 · Duplicate collection number and duplicate blog slug return a bare 500

`src/app/api/admin/collections/route.ts`, `src/app/api/admin/blog/route.ts:30`

`collections.number` and `blog_posts.slug` are both `UNIQUE`. Neither route catches
Postgres `23505`, so the constraint violation escapes as a framework 500 with no
JSON body. The modal shows "Save failed" with no indication of what is wrong.

Categories handles the same case correctly, returning **409 "Slug already exists"**
(`src/app/api/admin/categories/route.ts:23-28`) — copy that.

**Repro:** `admin/23-categories-collections.md` → TC-ADM-COL-009,
`admin/26-blog.md` → TC-ADM-BLG-006.

---

### KI-015 · S2 · Coupon PUT skips two validation rules

`src/lib/coupons.ts:59-71` with `partial = true`

The "percent cannot exceed 100" and "max cap only applies to percent" checks read
`body.discountType` — which is absent on a partial update.

**Effect:** `PUT {discountValue: 500}` onto an existing percent coupon creates a
**500%-off coupon**. `PUT {maxDiscountInr: 100}` onto a fixed coupon sets a cap
that should be impossible.

**Repro:** `admin/25-coupons.md` → TC-ADM-CPN-018.

**Suggested fix:** load the existing row and merge before validating.

---

### KI-016 · S2 · A 100%-off coupon produces a ₹0 order that Razorpay rejects

`src/db/queries/checkoutIntents.ts:115`, `src/lib/razorpay.ts:105`

`payableInr = Math.max(0, subtotal - discount)` reaches 0, and `createRazorpayOrder`
is then called with `amount: 0`. Razorpay rejects zero-amount orders, surfacing as
**502 "Failed to create payment order."** The checkout intent and its stock holds
are already committed at that point.

**Repro:** `customer/07-checkout.md` → TC-CHK-026 (coupon `TESTFULL`).

**Suggested fix:** when `payableInr === 0`, skip the gateway and fulfil directly.

---

### KI-017 · S2 · No CSRF protection anywhere

Every mutating route

There is no CSRF token in the codebase. `sameSite: "lax"` on `naami_session` is the
only defence. `POST /api/auth/signout` additionally requires **no session at all**
and always succeeds.

**Repro:** `security/41-auth-session.md` → TC-SEC-AUTH-021.

---

## S3 — Minor

### KI-018 · S3 · Homepage quick-view has no size selector

`src/components/ProductCarousel.tsx:855` — always adds
`product.sizes?.[0]?.size ?? "One Size"`, ignoring whether that size is in stock.
`src/components/HotspotBanner.tsx:254` and `src/components/HotspotCards.tsx:368`
hard-code `"One Size"` regardless of the product's real sizes.

**Effect:** a customer can add an out-of-stock size from the homepage and only
discover it at the cart availability check.

### KI-019 · S3 · `/collection` has one filter dimension and no sort

`src/components/CollectionPageContent.tsx:156-181`

Only collection-membership tabs exist. There is **no** size, category, price,
availability, colour or on-sale filter, **no sort control** of any kind, and no
pagination — every published product renders at once.

`categoryId` is returned by the API but never used here.

### KI-020 · S3 · Collection filter tabs never update the URL

`src/components/CollectionPageContent.tsx:35,162`

`?collection=` is read **once**, at initial `useState`. Clicking a tab changes
state only.

**Effect:** the filtered view is not shareable or bookmarkable after any
interaction, and browser Back does not undo a tab change.

Also: `?collection=abc`, `?collection=-1` or an unknown id all resolve to `null`
and **silently show every product** under the default heading.

### KI-021 · S3 · Three footer links use a parameter nothing reads

`src/components/EvanliteFooter.tsx:65-67`

Shirts / Accessories / Limited Editions link to `/collection?filter=SHIRTS` etc.
`CollectionPageContent` only reads `?collection=`. All three land on the unfiltered
page.

### KI-022 · S3 · Collection and product fetches fail silently

`src/components/CollectionPageContent.tsx:50-61`

Both use `.catch(() => {})`. A failure leaves the arrays empty, so the page renders
an empty grid and "0 items" with **no error message and no retry**.

### KI-023 · S3 · Profile renders the empty state on fetch failure

`src/app/profile/page.tsx:66,72`

Failed order and wishlist fetches are caught into `setLoading(false)`, leaving the
arrays empty — indistinguishable from genuinely having none.

Additionally the lazy-load guard is `length === 0`, so a genuinely empty list
**refetches on every tab switch**, while a non-empty list is cached forever and
never refreshes.

### KI-024 · S3 · Wishlist sign-in loses your place

`src/components/WishlistButton.tsx:28-31` pushes plain `/auth` with **no `?from=`**,
so after signing in you land at `/` rather than back on the product.

Related, same component: a logged-in user who clicks before `/api/wishlist`
resolves is also bounced to `/auth`; the `catch` branch at `:38` is unreachable
because `wishlistStore.toggle()` swallows its own errors; and a non-ok HTTP
response leaves the heart filled with nothing persisted
(`src/models/wishlistStore.ts:37,59`).

### KI-025 · S3 · Order lines with no size hide the quantity entirely

`src/app/orders/[id]/page.tsx:207-211`

`Size: {size} · Qty: {n}` is rendered only when `size` is truthy — so a sizeless
product shows neither.

### KI-026 · S3 · A partial order-page failure renders silently

`src/app/orders/[id]/page.tsx:70` — the items fetch uses `r.ok ? r.json() : []`, so
if only that call fails the order renders with **zero item rows and a Total**, with
no message.

### KI-027 · S3 · No `not-found.tsx` anywhere

Every 404 — bad product id, unpublished journal slug, typo'd URL — falls through to
Next's built-in page inside the site layout: header renders, no branded 404, no
footer.

### KI-028 · S3 · The cart has no quantity ceiling

`src/app/cart/page.tsx:223-230`

The "+" stepper is unbounded. The server cap is **20 per line**
(`src/lib/checkoutPricing.ts:33`), so a customer can build a 25-unit line and only
find out at checkout.

Related, same file `:53-55`: when stock drops below the cart quantity the line is
**silently clamped** with no message.

### KI-029 · S3 · The coupon is forwarded to checkout even if Apply was never pressed

`src/app/cart/page.tsx:327` — the link carries the raw typed input. Checkout
re-validates server-side, so a typo'd code silently produces no discount.

Related: the applied discount is **not re-validated when quantities change** in the
cart, so the displayed total can be stale. The real charge is always recomputed
server-side.

### KI-030 · S3 · Checkout silently zeroes an invalid coupon

`src/app/checkout/page.tsx:94-96` — any non-ok response or throw sets
`discountInr = 0` with no message. An expired or unauthenticated coupon just shows
no discount.

### KI-031 · S3 · Cart availability fails open

`src/app/cart/page.tsx:59-61` — `.catch(() => setAvailability({}))`. An outage, or
a 429 from the 60-per-minute limiter, leaves checkout enabled with unverified
stock.

### KI-032 · S3 · Product not-found and network failure are indistinguishable

`src/app/product/[id]/page.tsx:80,96` — both `!r.ok` and any throw render
"Product not found."

### KI-033 · S3 · Malformed JSON returns a bare 500 on ~20 routes

`POST /api/wishlist` and every `/api/admin/**` route that reads a body do not wrap
`request.json()`. A body of `{` escapes the handler as a framework 500 with no JSON.

Related: `POST /api/wishlist` with a nonexistent `productId` raises an uncaught FK
violation `23503` → 500 (`src/db/queries/wishlist.ts:32`).

### KI-034 · S3 · `POST /api/admin/design` crashes on a JSON `null` body

`src/app/api/admin/design/route.ts:17` — `typeof null === "object"` passes the
guard, then `Object.entries(null)` throws.

### KI-035 · S3 · Admin order detail never shows the shipping address

`src/app/admin/orders/[id]/page.tsx:175-179` — `shippingPhone` and
`shippingAddress` are fetched and present in the `Order` type, but only name and
email are rendered. Fulfilment staff cannot see where to ship.

### KI-036 · S3 · Three design tabs abort mid-save, leaving partial state

`src/app/admin/design/page.tsx:449-488` (Hotspot Cards), `:389-426` (Shared
Moments), and the Lookbook Banner's two sequential requests (`:190-202`).

Each loops sequentially and returns on the first failure — some rows saved, some
not, deletions already applied.

Related: the Shared Moments save **silently skips any row with a blank
`videoUrl`** (`:398`), so an added-but-never-uploaded video vanishes with no
warning.

### KI-037 · S3 · Feedback stars crash on an out-of-range rating

`src/app/admin/feedback/page.tsx:16-22` does `"★".repeat(rating)`. There is **no
`CHECK` constraint on `brand_feedback.rating`** (`src/db/schema.ts:682`) — only the
API validates 1–5. A row written any other way throws on render.

### KI-038 · S3 · The tracking URL is stored and rendered unvalidated

`src/app/api/admin/orders/[id]/route.ts:36-45` writes `trackingUrl` with no format
check; `src/app/orders/[id]/page.tsx:189` renders it as a link opening in a new
tab. A `javascript:` or attacker-controlled URL reaches the customer.

### KI-039 · S3 · Meta Pixel fires with no consent gate and 100×-understated values

`src/components/MetaPixel.tsx` has no consent check.
`src/app/product/[id]/page.tsx:92,126` send `priceInr / 100` for `ViewContent` and
`AddToCart` — prices are already whole rupees. (`InitiateCheckout` and `Purchase`
in `checkout/page.tsx` are correct.)

### KI-047 · S3 · A non-numeric product id returns 500, not 404

`src/app/api/products/[id]/route.ts`

The route does `Number(id)` and passes the result straight to the query.
`Number("abc")` is `NaN`, which Postgres rejects as an integer comparison, so the
error escapes as a framework 500 with no body.

```
GET /api/products/99999999  ->  404   correct
GET /api/products/abc       ->  500   should be 404
```

Found while writing the automated smoke suite — the two "not found" cases behave
inconsistently, and any crawler or mistyped link produces a 500 in the logs.

**Repro:** `tests/smoke.test.ts`, and `customer/05-product-detail.md` TC-PDP-005.

**Suggested fix:** guard with `Number.isInteger()` before querying. The same
pattern applies to every admin `[id]` route except `coupons/[id]/redemptions`,
which validates correctly.

---

## S4 — Cosmetic

- **KI-040** · Broken "next" arrow SVG — `d="M5 12h14M12 5l7 7 7 7"` should be
  `l7 7-7 7`. `src/components/HotspotCards.tsx:143` and
  `src/components/SharedMomentsCarousel.tsx:241`.
- **KI-041** · The Manifesto block carries `data-cursor-text="EXPLORE"` but is not
  clickable — `src/components/HomeClient.tsx:483`.
- **KI-042** · No "Feedback" tile on the admin dashboard although it is in the
  sidebar — `src/app/admin/page.tsx:20-29`.
- **KI-043** · `SizeGuideModal` contradicts itself: "For a relaxed fit, size up
  one" above, "size down when between sizes" below —
  `src/components/SizeGuideModal.tsx:63,113`.
- **KI-044** · `/about` content is stale and contradicts the brand — "Founded 2019 ·
  Lisbon, Portugal", fictional team names.
- **KI-045** · Native scrollbars are hidden site-wide (`globals.css:49-62`), so
  every horizontal carousel scrolls with no visual affordance.
- **KI-046** · The footer accordion trigger is a `div role="button" tabIndex={0}`
  with **no `onKeyDown`** — Enter and Space do not toggle it.
  `src/components/EvanliteFooter.tsx:111-117`.

---

## Dead code — exclude from testing

None of these are imported anywhere. Do not write cases against them.

| File | Note |
|---|---|
| `src/components/ProductGrid.tsx` | Dark theme, hardcoded USD products |
| `src/components/TwinBeadCursor.tsx` | Superseded by `CustomCursor` |
| `src/components/PageTransitionWrapper.tsx` | Unused |
| `src/models/products.ts` | Hardcoded demo products |
| `src/lib/idempotency.ts` | `withIdempotency` has no callers; only the purge runs |
| `src/db/queries/reservations.ts:307` | `availableStock` — see KI-003 |
