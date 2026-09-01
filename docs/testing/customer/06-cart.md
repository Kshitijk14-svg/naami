# 06 — Cart

`/cart` · `src/app/cart/page.tsx` · store in `src/models/cartStore.ts`

The cart lives entirely in **`localStorage` under `naami_cart`**. Nothing is stored
server-side until checkout. Clear it via DevTools → Application → Local Storage when
a case needs a clean start.

**Area prefix:** `TC-CART`

---

## Persistence

- [ ] **TC-CART-001** `[PROD-DATA]` — The cart survives a page reload
  - **Steps:** 1. Add two items 2. Hard-reload `/cart`
  - **Expect:** both lines still there with the right quantities.

- [ ] **TC-CART-002** `[PROD-DATA]` — The cart survives closing and reopening the browser
  - **Expect:** persisted. It is `localStorage`, not session storage.

- [ ] **TC-CART-003** `[PROD-DATA]` — **The cart survives signing out**
  - **Steps:** 1. Signed in, add items 2. Sign out 3. Open `/cart`
  - **Expect:** the items are still there. Sign-out only clears the session cookie.
    Confirm this is the intended behaviour — on a shared computer it leaks what the
    previous user was shopping for.

- [ ] **TC-CART-004** `[PROD-DATA]` — The cart is **not** shared between accounts
  - **Steps:** 1. As user A add items 2. Sign out, sign in as user B 3. Open `/cart`
  - **Expect:** user B sees user A's items, because the cart is per-browser not
    per-account. Record the behaviour — it follows from the design.

- [ ] **TC-CART-005** `[PROD-DATA]` — A brief empty flash on hard reload
  - **Steps:** 1. With items in the cart, hard-reload `/cart` and watch closely
  - **Expect:** you may see the empty state for one frame before items appear —
    `persist` rehydrates after first paint. Record if visible.

- [ ] **TC-CART-006** `[PROD-DATA]` — Clearing site data empties the cart

---

## Empty state

- [ ] **TC-CART-010** `[PROD-SAFE]` — The empty cart shows the full message block
  - **Expect:** "NAAMI // YOUR WARDROBE", **"Your cart is empty"**, "If found Wear
    again", the descriptive line, and an **"Explore Collections"** button.
- [ ] **TC-CART-011** `[PROD-SAFE]` — "Explore Collections" navigates to `/collection`
- [ ] **TC-CART-012** `[PROD-SAFE]` — The footer renders on the empty cart

---

## Line items

- [ ] **TC-CART-015** `[PROD-DATA]` — Each line shows thumbnail, name, size, unit price, total
- [ ] **TC-CART-016** `[PROD-DATA]` — Column headers read Item / Qty / Amount
- [ ] **TC-CART-017** `[PROD-DATA]` — The line total equals unit price × quantity
- [ ] **TC-CART-018** `[PROD-DATA]` — "Remove" deletes the line with no confirmation
  - **Expect:** it disappears immediately. No dialog.
- [ ] **TC-CART-019** `[PROD-DATA]` — Removing the last line shows the empty state

### Quantity stepper

- [ ] **TC-CART-022** `[PROD-DATA]` — "+" increments and updates the total
- [ ] **TC-CART-023** `[PROD-DATA]` — "−" decrements and updates the total
- [ ] **TC-CART-024** `[PROD-DATA]` — "−" at quantity 1 **removes the line**
  - **Steps:** 1. Set a line to quantity 1 2. Click "−"
  - **Expect:** the line is deleted entirely, with no confirmation. It does not stop
    at 1.
- [ ] **TC-CART-025** `[PROD-DATA]` — "+" has no upper limit in the UI
  - **Steps:** 1. Click "+" until the quantity reaches 25
  - **Expect:** it keeps going. ⚠ **KNOWN** KI-028 — the server cap is 20 per line
    and only bites at checkout.
- [ ] **TC-CART-026** `[PROD-DATA]` — A 21+ quantity is rejected at checkout
  - **Steps:** 1. Build a line of 21 2. Go to `/checkout` and click Pay
  - **Expect:** **"You can order at most 20 of any one item. Please contact us for
    bulk orders."**
  - **Cleanup:** reduce to 20 or empty the cart.
- [ ] **TC-CART-027** `[PROD-DATA]` — Exactly 20 is accepted
  - **Pre:** a `trackStock: false` product so stock is not the limiting factor
  - **Expect:** checkout proceeds to the Razorpay step.
- [ ] **TC-CART-028** `[PROD-DATA]` — Steppers are disabled on an unavailable line

---

## Availability re-check

`POST /api/cart/availability` · runs when the **set of lines** changes

- [ ] **TC-CART-032** `[PROD-DATA]` — The check fires on load with items present
  - **Steps:** 1. Open DevTools → Network 2. Load `/cart` with items
  - **Expect:** one POST to `/api/cart/availability`.

- [ ] **TC-CART-033** `[PROD-DATA]` — The check does **not** fire on a quantity change
  - **Steps:** 1. Click "+" 2. Watch the Network tab
  - **Expect:** no new request. Deliberate — but it means stock is never
    revalidated as quantity grows.

- [ ] **TC-CART-034** `[PROD-DATA]` — The check fires when a line is added or removed

- [ ] **TC-CART-035** `[PROD-DATA]` — An out-of-stock line is marked and dimmed
  - **Pre:** add a product, then set its stock to 0 in admin
  - **Steps:** 1. Reload `/cart`
  - **Expect:** the line shows **"Out of stock"**, drops to half opacity, and its
    steppers are disabled.
  - **Cleanup:** restore stock.

- [ ] **TC-CART-036** `[PROD-DATA]` — Quantity is **silently clamped** when stock drops
  - **Pre:** cart line quantity 5; set that size's stock to 2 in admin
  - **Steps:** 1. Reload `/cart`
  - **Expect:** the quantity becomes 2 with **no message explaining why**.
  - ⚠ **KNOWN** KI-028. Confirm the silence — this is the point of the case.
  - **Cleanup:** restore stock.

- [ ] **TC-CART-037** `[PROD-DATA]` — An unpublished product is marked unavailable
  - **Pre:** add a product, then unpublish it
  - **Expect:** "Out of stock" on that line.

- [ ] **TC-CART-038** `[PROD-DATA]` — An infinite-stock product is always available

- [ ] **TC-CART-039** `[LOCAL-ONLY]` — A failed check **fails open**
  - **Steps:** 1. Block `/api/cart/availability` 2. Reload `/cart`
  - **Expect:** every line looks available and checkout stays enabled.
  - ⚠ **KNOWN** KI-031.

- [ ] **TC-CART-040** `[LOCAL-ONLY]` — Exceeding the rate limit also fails open
  - **Steps:** 1. Reload `/cart` more than 60 times in a minute
  - **Expect:** the endpoint 429s and the cart still shows everything as available.

- [ ] **TC-CART-041** `[LOCAL-ONLY]` — Stock held by another shopper is **not** reflected
  - **Steps:** 1. In session A, take a product's last unit through to the Razorpay
    screen without paying 2. In session B, add the same product and open `/cart`
  - **Expect:** session B's cart shows it as available even though it is held.
  - ⚠ **KNOWN** KI-003 — `availableStock()` exists for exactly this and is unused.

---

## Coupons

`POST /api/checkout/apply-coupon` · **requires a session**

- [ ] **TC-CART-045** `[PROD-DATA]` — A valid coupon applies and shows a discount
  - **Pre:** signed in, cart above any minimum
  - **Steps:** 1. Enter `TESTPCT` 2. Click Apply
  - **Expect:** green **"Discount applied: −₹X"**, a Discount row, and a reduced
    Total.

- [ ] **TC-CART-046** `[PROD-DATA]` — The input force-uppercases as you type
  - **Steps:** 1. Type `testpct`
  - **Expect:** it displays as `TESTPCT`.

- [ ] **TC-CART-047** `[PROD-DATA]` — Enter submits the coupon
- [ ] **TC-CART-048** `[PROD-DATA]` — An empty code does nothing
- [ ] **TC-CART-049** `[PROD-SAFE]` — Signed out shows **"Please log in to apply a coupon."**
  - **Expect:** that specific message, not a generic error. This is the only place
    the cart acknowledges auth at all.

- [ ] **TC-CART-050** `[PROD-DATA]` — An unknown code shows "Invalid or inactive coupon."
- [ ] **TC-CART-051** `[PROD-DATA]` — An expired coupon shows "This coupon has expired."
  - **Pre:** coupon `TESTEXP`
- [ ] **TC-CART-052** `[PROD-DATA]` — A not-yet-active coupon shows "This coupon is not active yet."
- [ ] **TC-CART-053** `[PROD-DATA]` — Below the minimum shows the exact amount
  - **Pre:** `TESTFIX` (min ₹500), cart total ₹200
  - **Expect:** **"Minimum order value of ₹500 required."** with Indian grouping.
- [ ] **TC-CART-054** `[PROD-DATA]` — An exhausted per-user coupon is rejected
  - **Pre:** `TESTONCE` already used once by this account
  - **Expect:** "You have already used this coupon the maximum number of times."
- [ ] **TC-CART-055** `[PROD-DATA]` — A used-up coupon shows "This coupon has reached its usage limit."
- [ ] **TC-CART-056** `[PROD-DATA]` — A percent cap limits the discount
  - **Pre:** `TESTPCT` — 10% capped at ₹50; cart total ₹1000
  - **Expect:** the discount is ₹50, not ₹100.
- [ ] **TC-CART-057** `[LOCAL-ONLY]` — More than 10 attempts a minute is throttled
  - **Expect:** "Too many attempts. Please try again in a minute."
- [ ] **TC-CART-058** `[PROD-DATA]` — An empty cart rejects any coupon
  - **Expect:** "Cart is empty." — the cart is priced before the coupon is looked at.

- [ ] **TC-CART-059** `[PROD-DATA]` — **The discount does not update when quantities change**
  - **Steps:** 1. Apply `TESTPCT` to a ₹1000 cart 2. Note the discount 3. Click "+"
    to double the quantity 4. Look at the Discount row
  - **Expect:** the discount is unchanged — stale. ⚠ **KNOWN** KI-029. The real
    charge is recomputed server-side, so this is a display defect, not a pricing one.

- [ ] **TC-CART-060** `[PROD-DATA]` — A typed-but-not-applied coupon is still forwarded
  - **Steps:** 1. Type `TESTPCT` but **do not** click Apply 2. Click "Proceed to
    Checkout" 3. Look at the URL
  - **Expect:** `?coupon=TESTPCT` is present. ⚠ **KNOWN** KI-029.

---

## Checkout CTA — three states

- [ ] **TC-CART-064** `[PROD-DATA]` — Normal: an enabled link to `/checkout`
- [ ] **TC-CART-065** `[PROD-DATA]` — While checking: "Checking availability…", not clickable
  - **Steps:** 1. Throttle to Slow 3G 2. Reload `/cart` 3. Click immediately
  - **Expect:** the label reads "Checking availability…" at reduced opacity with a
    `wait` cursor, and the click does nothing.
- [ ] **TC-CART-066** `[PROD-DATA]` — Any unavailable line blocks checkout
  - **Expect:** a grey non-clickable block plus **"Remove or wait for the
    out-of-stock item(s) above to become available before checking out."**
- [ ] **TC-CART-067** `[PROD-DATA]` — Removing the unavailable line re-enables checkout

---

## Other

- [ ] **TC-CART-070** `[PROD-DATA]` — Subtotal equals the sum of line totals
- [ ] **TC-CART-071** `[PROD-DATA]` — The summary panel sticks while scrolling on desktop
- [ ] **TC-CART-072** `[PROD-SAFE]` — "← Continue Shopping" goes to `/collection`
- [ ] **TC-CART-073** `[PROD-DATA]` — The WhatsApp button appears only when configured
  - **Pre:** `NEXT_PUBLIC_WHATSAPP_NUMBER` set
  - **Expect:** opens `wa.me` in a new tab with a pre-filled item list and the
    discounted total.
- [ ] **TC-CART-074** `[PROD-SAFE]` — There is **no** "clear cart" control
  - **Expect:** confirm absence. Items must be removed one at a time. Record as S3.
- [ ] **TC-CART-075** `[PROD-SAFE]` — There is no cart drawer or mini-cart anywhere
  - **Expect:** the navbar cart icon navigates to `/cart`; nothing slides open.
- [ ] **TC-CART-076** `[PROD-DATA]` — A cart with many lines still renders correctly
  - **Steps:** 1. Add 15 different products 2. Check layout at 375px and 1440px
