# 09 — Profile

`/profile` · `src/app/profile/page.tsx`

Three tabs: Profile, Order History, Wishlist. Proxy-protected — a signed-out
visitor never reaches the page.

**Area prefix:** `TC-PROF`

---

## Access & shell

- [ ] **TC-PROF-001** `[PROD-SAFE]` — Signed out redirects to `/auth?from=/profile`
  - **Steps:** 1. Sign out 2. Navigate to `/profile`
  - **Expect:** redirected before the page renders, with the return path in the URL.
- [ ] **TC-PROF-002** `[PROD-SAFE]` — Signing in from there returns you to `/profile`
- [ ] **TC-PROF-003** `[PROD-SAFE]` — The heading shows the name, or the email local part
  - **Pre:** an account with no name set
  - **Expect:** the part before the `@` is used as the heading.
- [ ] **TC-PROF-004** `[PROD-SAFE]` — The email renders below the heading
- [ ] **TC-PROF-005** `[PROD-SAFE]` — A pulsing dot shows while the session loads
  - **Note:** there is no route skeleton for `/profile`, so this dot is the only
    loading affordance.
- [ ] **TC-PROF-006** `[PROD-SAFE]` — Three tabs render, Profile active by default
- [ ] **TC-PROF-007** `[PROD-SAFE]` — The active tab has maroon text and an underline

---

## Tab behaviour

- [ ] **TC-PROF-010** `[PROD-SAFE]` — Switching tabs changes the panel
- [ ] **TC-PROF-011** `[PROD-SAFE]` — **The URL never changes**
  - **Steps:** 1. Click "Order History" 2. Read the address bar
  - **Expect:** still `/profile`. Tabs are not linkable and cannot be shared.
    Record as S3.
- [ ] **TC-PROF-012** `[PROD-SAFE]` — Browser Back does not switch tabs
  - **Steps:** 1. Switch to Wishlist 2. Press Back
  - **Expect:** you leave `/profile` entirely.
- [ ] **TC-PROF-013** `[PROD-SAFE]` — Reloading returns to the Profile tab
- [ ] **TC-PROF-014** `[PROD-DATA]` — Orders load on first open of that tab
  - **Steps:** 1. Open DevTools → Network 2. Click "Order History"
  - **Expect:** `GET /api/orders` fires once.
- [ ] **TC-PROF-015** `[PROD-DATA]` — A **non-empty** order list is not refetched
  - **Steps:** 1. Open Orders 2. Switch to Wishlist 3. Switch back to Orders
  - **Expect:** no second request. The list is cached for the page's lifetime — so
    an order placed in another tab will **not** appear until you reload.
- [ ] **TC-PROF-016** `[PROD-DATA]` — An **empty** order list is refetched every time
  - **Pre:** an account with zero orders
  - **Steps:** 1. Open Orders 2. Switch away 3. Switch back 4. Count the requests
  - **Expect:** a new request each time. ⚠ **KNOWN** KI-023 — the guard is
    `length === 0`, so empty lists never cache. Record how many requests you see.
- [ ] **TC-PROF-017** `[PROD-DATA]` — The same rules apply to the Wishlist tab

---

## Profile tab

- [ ] **TC-PROF-020** `[PROD-SAFE]` — Shows Name, Email and Role as read-only rows
- [ ] **TC-PROF-021** `[PROD-SAFE]` — The role label is human-readable
  - **Expect:** "Customer" / "Staff" / "Admin" / "Super Admin", not the raw enum.
- [ ] **TC-PROF-022** `[PROD-SAFE]` — There is **no** edit capability
  - **Expect:** confirm absence of: edit name, change password, saved addresses,
    delete account, and any sign-out button on this page. Sign-out lives only in the
    navbar dropdown and mobile menu. Record the gaps as S3 product items.

---

## Order history tab

- [ ] **TC-PROF-026** `[PROD-DATA]` — Orders list newest first
- [ ] **TC-PROF-027** `[PROD-DATA]` — Each row shows id, date, status chip and total
- [ ] **TC-PROF-028** `[PROD-DATA]` — Clicking a row opens `/orders/{id}`
- [ ] **TC-PROF-029** `[PROD-DATA]` — Only **your own** orders appear
  - **Steps:** 1. Note an order id belonging to another account 2. Confirm it is
    absent here
- [ ] **TC-PROF-030** `[PROD-SAFE]` — Zero orders shows "No orders yet." + "Shop the Collection →"
- [ ] **TC-PROF-031** `[PROD-DATA]` — Status colours barely differ
  - **Steps:** 1. View orders in several statuses side by side
  - **Expect:** only `cancelled` is maroon; pending, confirmed, shipped and
    delivered are all the same near-black. Status is effectively indistinguishable
    by colour. Record as S3.
- [ ] **TC-PROF-032** `[LOCAL-ONLY]` — **A failed fetch shows the empty state**
  - **Steps:** 1. Block `/api/orders` 2. Open the Orders tab
  - **Expect:** "No orders yet." — indistinguishable from genuinely having none.
  - ⚠ **KNOWN** KI-023. A customer with orders is told they have none.
- [ ] **TC-PROF-033** `[PROD-DATA]` — There is no pagination
  - **Expect:** every order renders at once. Note the behaviour with many orders.

---

## Wishlist tab

- [ ] **TC-PROF-037** `[PROD-DATA]` — Wishlisted products appear as cards
  - **Pre:** two products wishlisted from `/product/{id}`
- [ ] **TC-PROF-038** `[PROD-DATA]` — Each card shows image, number, name and price
- [ ] **TC-PROF-039** `[PROD-DATA]` — Clicking a card opens that product
- [ ] **TC-PROF-040** `[PROD-DATA]` — "Remove" takes the item out of the list
- [ ] **TC-PROF-041** `[PROD-DATA]` — Removal persists across a reload
- [ ] **TC-PROF-042** `[PROD-DATA]` — Hearts elsewhere do not update until reload
  - **Steps:** 1. Remove an item here 2. Open that product in another tab **without
    reloading** the store
  - **Expect:** the heart may still show filled. The remove does not sync the shared
    wishlist store. ⚠ **KNOWN** KI-024.
- [ ] **TC-PROF-043** `[LOCAL-ONLY]` — A failed remove still disappears from the UI
  - **Steps:** 1. Block `/api/wishlist/*` 2. Click Remove 3. Reload
  - **Expect:** it vanishes, then comes back after reload — the response is never
    checked. ⚠ **KNOWN** KI-024.
- [ ] **TC-PROF-044** `[PROD-SAFE]` — Empty shows "Your wishlist is empty." + "Discover the Atelier →"
- [ ] **TC-PROF-045** `[LOCAL-ONLY]` — A failed fetch also shows the empty state ⚠ **KNOWN** KI-023
- [ ] **TC-PROF-046** `[PROD-DATA]` — An unpublished wishlisted product still lists
  - **Pre:** wishlist a product, then unpublish it
  - **Expect:** it still appears here with its name and price, but the product link
    404s. Record as S3 — a minor leak of unreleased product data.

---

## Layout

- [ ] **TC-PROF-050** `[PROD-SAFE]` — Wishlist grid is 2 columns on mobile, 3 at `md`
- [ ] **TC-PROF-051** `[PROD-SAFE]` — Tabs remain usable at 320px
- [ ] **TC-PROF-052** `[PROD-SAFE]` — Long order ids and emails do not overflow
- [ ] **TC-PROF-053** `[PROD-SAFE]` — The footer renders on every tab
