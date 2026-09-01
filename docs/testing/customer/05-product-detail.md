# 05 — Product Detail

`/product/[id]` · `src/app/product/[id]/page.tsx`

**Area prefix:** `TC-PDP`

---

## Page states

- [ ] **TC-PDP-001** `[PROD-SAFE]` — A valid published product renders fully
  - **Expect:** gallery, number line, name, subtitle, metafields, price, size
    selector (if sized), CTA.

- [ ] **TC-PDP-002** `[PROD-SAFE]` — The route skeleton shows during navigation
  - **Expect:** placeholders for image, label, heading, subtitle, 3 spec rows,
    price and CTA.

- [ ] **TC-PDP-003** `[PROD-SAFE]` — An in-page "LOADING…" state follows the skeleton

- [ ] **TC-PDP-004** `[PROD-SAFE]` — A nonexistent id shows "Product not found."
  - **Steps:** `/product/99999999`
  - **Expect:** the message plus a "Return to Atelier" link to `/`.

- [ ] **TC-PDP-005** `[PROD-SAFE]` — A non-numeric id behaves the same
  - **Steps:** `/product/abc`

- [ ] **TC-PDP-006** `[PROD-SAFE]` — An **unpublished** product 404s identically
  - **Pre:** an unpublished product id
  - **Expect:** "Product not found." — indistinguishable from a nonexistent id,
    which is deliberate.

- [ ] **TC-PDP-007** `[LOCAL-ONLY]` — A network failure looks identical to a 404
  - **Steps:** 1. Block `/api/products/*` 2. Load a valid product
  - **Expect:** "Product not found." with no distinction from a genuine 404.
  - ⚠ **KNOWN** KI-032 — a transient outage tells the customer the product does not
    exist.

- [ ] **TC-PDP-008** `[PROD-SAFE]` — Navigating between products scrolls to the top
  - **Steps:** 1. Scroll down 2. Use search to open a different product
  - **Expect:** the new page starts at the top.

---

## Image gallery

- [ ] **TC-PDP-012** `[PROD-SAFE]` — A product with multiple images shows a thumbnail strip
- [ ] **TC-PDP-013** `[PROD-SAFE]` — A product with **one** image shows no strip
  - **Expect:** the strip renders only when there are 2+ images.
- [ ] **TC-PDP-014** `[PROD-SAFE]` — Clicking a thumbnail slides the main image
  - **Expect:** a smooth ~0.6s transition, and the selected thumb gains a maroon
    border.
- [ ] **TC-PDP-015** `[PROD-SAFE]` — The main image cannot be swiped or dragged
  - **Expect:** confirm absence. Navigation is via thumbnails only — by design.
- [ ] **TC-PDP-016** `[PROD-SAFE]` — There is no zoom, lightbox or fullscreen
  - **Expect:** clicking the main image does nothing. Record as S3 if wanted.
- [ ] **TC-PDP-017** `[PROD-SAFE]` — Keyboard cannot change images
- [ ] **TC-PDP-018** `[PROD-DATA]` — A product with no images falls back to its main image
  - **Expect:** a single image, no thumbnail strip.
- [ ] **TC-PDP-019** `[PROD-DATA]` — Six images all appear in the strip in admin order
  - **Pre:** a product with 6 images in a known order
  - **Expect:** the strip matches the admin drag order, and the first is the main.

---

## Product information

- [ ] **TC-PDP-023** `[PROD-SAFE]` — The number line reads `{number} // NAAMI ATELIER`
- [ ] **TC-PDP-024** `[PROD-SAFE]` — "← Back to Homepage" navigates to `/`
- [ ] **TC-PDP-025** `[PROD-SAFE]` — **All** metafields render, not just three
  - **Pre:** a product with 5+ metafields
  - **Expect:** every row. This is the only place the full list appears.
- [ ] **TC-PDP-026** `[PROD-SAFE]` — A product with no metafields renders no table
- [ ] **TC-PDP-027** `[PROD-SAFE]` — Price shows in INR with Indian digit grouping
  - **Expect:** e.g. `₹1,00,000` not `₹100,000`.
- [ ] **TC-PDP-028** `[PROD-DATA]` — A compare-at price shows strikethrough and `−N%`
  - **Pre:** price 1000, compare-at 2000
  - **Expect:** `₹2,000` struck through and `−50%`.
- [ ] **TC-PDP-029** `[PROD-DATA]` — A compare-at **below** the price shows no badge
  - **Pre:** price 2000, compare-at 1000
  - **Expect:** no strikethrough, no negative percentage. The admin form warns about
    this but does not block it.

---

## Size selection

- [ ] **TC-PDP-033** `[PROD-SAFE]` — A sizeless product shows no selector
- [ ] **TC-PDP-034** `[PROD-SAFE]` — Sizes render in the admin-defined order
- [ ] **TC-PDP-035** `[PROD-SAFE]` — An out-of-stock size is disabled and struck through
  - **Expect:** greyed, `line-through`, tooltip "Out of stock", not clickable.
- [ ] **TC-PDP-036** `[PROD-SAFE]` — Selecting a size highlights it
- [ ] **TC-PDP-037** `[PROD-SAFE]` — Selection can be changed freely
- [ ] **TC-PDP-038** `[PROD-SAFE]` — "Size Guide" opens the modal

### Size guide modal

- [ ] **TC-PDP-041** `[PROD-SAFE]` — Shows six rows XS–XXL with chest/waist/hip
  - **Expect:** measurements in both inches and cm.
- [ ] **TC-PDP-042** `[PROD-SAFE]` — Escape closes it
- [ ] **TC-PDP-043** `[PROD-SAFE]` — Backdrop click closes it
- [ ] **TC-PDP-044** `[PROD-SAFE]` — The × button closes it
- [ ] **TC-PDP-045** `[PROD-SAFE]` — Clicking inside does not close it
- [ ] **TC-PDP-046** `[PROD-SAFE]` — Background scroll is locked while open
- [ ] **TC-PDP-047** `[PROD-SAFE]` — The table scrolls horizontally on a narrow screen
- [ ] **TC-PDP-048** `[PROD-SAFE]` — The fit advice contradicts itself
  - **Steps:** 1. Read the note above the table, then the note below it
  - **Expect:** "For a relaxed fit, size up one" above and "size down when between
    sizes" below. ⚠ **KNOWN** KI-043 — content fix needed.

---

## Add to cart

- [ ] **TC-PDP-052** `[PROD-DATA]` — Adding shows a green "ADDED TO WARDROBE ✓"
  - **Steps:** 1. Select an in-stock size 2. Click "ADD TO WARDROBE"
  - **Expect:** the button turns green with the tick for about 2 seconds, then
    reverts. The navbar badge increments.
  - **Cleanup:** empty the cart.

- [ ] **TC-PDP-053** `[PROD-DATA]` — Adding without a size shows "Please select a size"
  - **Pre:** a product with 2+ sizes
  - **Expect:** the label turns maroon for ~2 seconds. **Nothing is added** — check
    the badge does not change.

- [ ] **TC-PDP-054** `[PROD-DATA]` — A single-size product adds without selection

- [ ] **TC-PDP-055** `[PROD-SAFE]` — A fully out-of-stock product disables the CTA
  - **Expect:** the button reads **"OUT OF STOCK"**, is grey and disabled, and the
    arrow icon is hidden. A black "Out of Stock" chip also appears in the price
    block.

- [ ] **TC-PDP-056** `[PROD-DATA]` — Adding the same product twice increments quantity
  - **Steps:** 1. Add size M 2. Add size M again 3. Open `/cart`
  - **Expect:** **one** line with quantity 2.

- [ ] **TC-PDP-057** `[PROD-DATA]` — Adding two different sizes creates two lines
  - **Steps:** 1. Add M 2. Add L 3. Open `/cart`
  - **Expect:** two separate lines. Line identity is product + size.

- [ ] **TC-PDP-058** `[PROD-DATA]` — "View Cart →" navigates to `/cart`

- [ ] **TC-PDP-059** `[PROD-DATA]` — A `trackStock: false` product always adds
  - **Pre:** a product with **Infinite stock** checked
  - **Expect:** it never shows out of stock and always adds.

---

## Wishlist button

`src/components/WishlistButton.tsx` · two instances — over the image and beside the CTA

- [ ] **TC-PDP-063** `[PROD-DATA]` — Signed in, clicking fills the heart
  - **Expect:** it turns maroon and filled. Reload and confirm it persists.
  - **Cleanup:** unwishlist it.

- [ ] **TC-PDP-064** `[PROD-DATA]` — Clicking again removes it
- [ ] **TC-PDP-065** `[PROD-DATA]` — Both instances stay in sync
  - **Steps:** 1. Click the heart over the image 2. Look at the one beside the CTA
  - **Expect:** both filled.

- [ ] **TC-PDP-066** `[PROD-SAFE]` — Signed out, clicking redirects to `/auth`
  - **Expect:** you land on `/auth` with **no `?from=`** — so after signing in you
    end up at `/`, not back on this product.
  - ⚠ **KNOWN** KI-024.

- [ ] **TC-PDP-067** `[PROD-DATA]` — Wishlisted items appear in `/profile` → Wishlist

- [ ] **TC-PDP-068** `[LOCAL-ONLY]` — A failed toggle leaves the heart wrongly filled
  - **Steps:** 1. Signed in, block `/api/wishlist` 2. Click the heart
  - **Expect:** the heart fills but nothing is saved; reload and it is empty.
  - ⚠ **KNOWN** KI-024 — the optimistic state is not reverted on a non-ok response.

- [ ] **TC-PDP-069** `[PROD-SAFE]` — Clicking immediately on load may bounce you to `/auth`
  - **Steps:** 1. Signed in, throttle the network to Slow 3G 2. Reload 3. Click the
    heart before the page settles
  - **Expect:** you may be sent to `/auth` despite being signed in.
  - ⚠ **KNOWN** KI-024 — a load race. Record whether it reproduces.

---

## Analytics

- [ ] **TC-PDP-073** `[PROD-SAFE]` — A `ViewContent` pixel event fires on load
  - **Steps:** 1. Open DevTools → Network, filter `facebook` 2. Load a product
  - **Expect:** a request fires. Check the `value` parameter against the real price.
  - ⚠ **KNOWN** KI-039 — the value is sent as `price / 100`, so a ₹5,000 product
    reports ₹50.

- [ ] **TC-PDP-074** `[PROD-DATA]` — An `AddToCart` event fires on add
  - **Expect:** fires, with the same 100× understatement.

- [ ] **TC-PDP-075** `[PROD-SAFE]` — No consent gate exists
  - **Expect:** the pixel fires before any cookie banner, because there is none.
    Record as a compliance item if you sell into the EU/UK.
