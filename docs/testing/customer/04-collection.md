# 04 — Collection Page & Filtering

`/collection` · `src/components/CollectionPageContent.tsx`

## What filtering actually exists

Before testing, understand the real scope — it is much narrower than a typical
storefront, and several cases below exist to *confirm the absence* of a feature so
it gets recorded rather than assumed.

| Dimension | Present | Notes |
|---|---|---|
| **Collection / series** | ✅ **Yes** | Tab strip. The only filter on the page. |
| Size | ❌ No | |
| Category | ❌ No | `categoryId` is returned by the API but never used here |
| Price / price range | ❌ No | |
| In stock only | ❌ No | Out-of-stock products render identically to in-stock |
| Colour / material / fabric | ❌ No | |
| On sale / discounted | ❌ No | The `−N%` badge shows but is not filterable |
| Text search | ❌ No | Only the global navbar search |
| **Sort (any kind)** | ❌ **No** | No price, newest or name ordering. Order is whatever the API returns. |
| Pagination / load more | ❌ No | Every published product renders at once |

Tabs are **mutually exclusive single-select** — there is no multi-select and no
filter combination logic to test.

**Area prefix:** `TC-COLL`

---

## Tab filtering

- [ ] **TC-COLL-001** `[PROD-SAFE]` — A default tab and one tab per published collection render
  - **Steps:** 1. Load `/collection` 2. Count the tabs
  - **Expect:** a default "The Collection" tab plus one per published collection.

- [ ] **TC-COLL-002** `[PROD-SAFE]` — The default tab shows every published product
  - **Expect:** the item count equals the total published product count.

- [ ] **TC-COLL-003** `[PROD-SAFE]` — Clicking a collection tab filters the grid
  - **Steps:** 1. Click a collection tab 2. Count the cards
  - **Expect:** only that collection's products, and the count matches.

- [ ] **TC-COLL-004** `[PROD-SAFE]` — Tabs are single-select
  - **Steps:** 1. Click tab A 2. Click tab B
  - **Expect:** B is active and A is not. There is no way to select both.

- [ ] **TC-COLL-005** `[PROD-SAFE]` — Returning to the default tab restores everything

- [ ] **TC-COLL-006** `[PROD-SAFE]` — The item count updates with the filter
  - **Expect:** `{n} items`, right-aligned, matching the visible cards exactly.

- [ ] **TC-COLL-007** `[PROD-DATA]` — A collection with zero published products shows an empty grid
  - **Pre:** a collection whose products are all unpublished
  - **Expect:** "0 items" and no cards. **Note whether any empty-state message
    appears** — there is none in the code, so an empty grid with a bare "0 items" is
    expected. Record as S3 if you want copy there.

- [ ] **TC-COLL-008** `[PROD-SAFE]` — Unpublished products never appear in any tab

- [ ] **TC-COLL-009** `[PROD-SAFE]` — The tab strip scrolls horizontally when tabs overflow
  - **Steps:** 1. Narrow the viewport to 375px
  - **Expect:** the strip scrolls sideways. Note there is **no visible scrollbar**
    (KI-045) — confirm it is still discoverable.

---

## URL state

⚠ **KNOWN** KI-020 — the URL is read once at mount and never written.

- [ ] **TC-COLL-012** `[PROD-SAFE]` — `?collection={id}` preselects that tab
  - **Steps:** 1. Note a collection's id 2. Load `/collection?collection={id}`
  - **Expect:** that tab is active on arrival and the grid is filtered.

- [ ] **TC-COLL-013** `[PROD-SAFE]` — Clicking a tab does **not** change the URL
  - **Steps:** 1. Load `/collection` 2. Click a collection tab 3. Look at the address bar
  - **Expect:** the URL stays `/collection`. ⚠ **KNOWN** KI-020 — the filtered view
    is not shareable or bookmarkable after interaction.

- [ ] **TC-COLL-014** `[PROD-SAFE]` — Browser Back does not undo a tab change
  - **Steps:** 1. Arrive from the homepage 2. Click a tab 3. Press Back
  - **Expect:** you leave the page entirely rather than returning to the previous
    tab.

- [ ] **TC-COLL-015** `[PROD-SAFE]` — `?collection=abc` silently shows everything
  - **Expect:** no error; the default tab is active and all products show.

- [ ] **TC-COLL-016** `[PROD-SAFE]` — `?collection=-1` silently shows everything
- [ ] **TC-COLL-017** `[PROD-SAFE]` — `?collection=99999` (unknown id) silently shows everything
- [ ] **TC-COLL-018** `[PROD-SAFE]` — `?collection=` (empty) silently shows everything
- [ ] **TC-COLL-019** `[PROD-SAFE]` — `?filter=SHIRTS` is ignored entirely
  - **Steps:** 1. Load `/collection?filter=SHIRTS`
  - **Expect:** unfiltered. ⚠ **KNOWN** KI-021 — three footer links point here.
- [ ] **TC-COLL-020** `[PROD-SAFE]` — An unpublished collection's id does not preselect
  - **Pre:** an unpublished collection's id
  - **Expect:** falls back to the default tab, since only published collections load.

---

## Grid & cards

- [ ] **TC-COLL-025** `[PROD-SAFE]` — 2 columns on mobile, 3 at `md`, 4 at `lg`
- [ ] **TC-COLL-026** `[PROD-SAFE]` — Cards fade in as you scroll
- [ ] **TC-COLL-027** `[PROD-SAFE]` — Cards re-reveal after switching tabs
  - **Steps:** 1. Scroll down 2. Switch tabs 3. Confirm the new cards are visible
  - **Expect:** no invisible cards. Every card starts at `opacity: 0` and depends on
    the reveal firing.
- [ ] **TC-COLL-028** `[LOCAL-ONLY]` — A scroll-animation failure leaves the grid invisible
  - **Steps:** 1. Block GSAP 2. Reload
  - **Expect:** confirm and record. This is a whole-page blank risk, not just
    missing animation.
- [ ] **TC-COLL-029** `[PROD-SAFE]` — Each card shows image, number badge, name, subtitle, price
- [ ] **TC-COLL-030** `[PROD-SAFE]` — Discounted products show strikethrough and `−N%`
- [ ] **TC-COLL-031** `[PROD-SAFE]` — There is **no** wishlist button on grid cards
  - **Expect:** confirm absence. Hearts exist only on `/product/{id}` and homepage
    carousel cards.
- [ ] **TC-COLL-032** `[PROD-SAFE]` — There is **no** out-of-stock indicator on grid cards
  - **Pre:** a fully out-of-stock published product
  - **Expect:** its card looks identical to an in-stock one. Record as S3 — the
    product page does show an "Out of Stock" chip, so this is inconsistent.
- [ ] **TC-COLL-033** `[PROD-SAFE]` — Hovering a card scales the image and reddens the name

---

## Product modal

- [ ] **TC-COLL-038** `[PROD-SAFE]` — Clicking a card opens the modal
- [ ] **TC-COLL-039** `[PROD-SAFE]` — Background scroll is locked while open
- [ ] **TC-COLL-040** `[PROD-SAFE]` — Backdrop click closes it
- [ ] **TC-COLL-041** `[PROD-SAFE]` — Clicking **inside** the modal does not close it
  - **Steps:** 1. Click the product name inside the panel
  - **Expect:** it stays open.
- [ ] **TC-COLL-042** `[PROD-SAFE]` — The "✕ Close" button closes it
- [ ] **TC-COLL-043** `[PROD-SAFE]` — Escape does **not** close it
  - ⚠ **KNOWN** — inconsistent with `SizeGuideModal` and `MobileMenu`.
- [ ] **TC-COLL-044** `[PROD-SAFE]` — Shows only the **first 3** metafields
- [ ] **TC-COLL-045** `[PROD-SAFE]` — The detail column scrolls when content is long
  - **Expect:** the modal stays within 90% of viewport height.

### Size selection in the modal

- [ ] **TC-COLL-048** `[PROD-SAFE]` — No size selector for a sizeless product
- [ ] **TC-COLL-049** `[PROD-SAFE]` — Size buttons render for a sized product
- [ ] **TC-COLL-050** `[PROD-SAFE]` — Out-of-stock sizes are disabled and struck through
  - **Expect:** greyed, `line-through`, not clickable, tooltip "Out of stock".
- [ ] **TC-COLL-051** `[PROD-SAFE]` — The selected size gets a maroon border
- [ ] **TC-COLL-052** `[PROD-DATA]` — Adding without choosing a size shows an error
  - **Pre:** a product with 2+ sizes
  - **Steps:** 1. Open the modal 2. Click "Add to Wardrobe" without selecting
  - **Expect:** the label turns maroon and reads **"Please select a size"** for
    about 2 seconds. **Nothing is added.**
- [ ] **TC-COLL-053** `[PROD-DATA]` — A single-size product adds without selection
  - **Expect:** the one size is used automatically.
- [ ] **TC-COLL-054** `[PROD-DATA]` — Adding a valid size closes the modal
  - **Expect:** the modal closes and the navbar cart badge increments. There is
    **no "Added ✓" confirmation** here, unlike the product page.
  - **Cleanup:** empty the cart.
- [ ] **TC-COLL-055** `[PROD-DATA]` — A zero-stock size cannot be added
  - **Expect:** the same "Please select a size" treatment, nothing added.

### Cart image consistency

- [ ] **TC-COLL-058** `[PROD-DATA]` — Same product from two places may show different thumbnails
  - **Steps:** 1. Add product X from `/collection` 2. Empty the cart 3. Add the same
    product from `/product/{id}` 4. Compare the cart thumbnail each time
  - **Expect:** they should match. The collection modal stores
    `thumbnailImage ?? image` while the product page stores the full `image` — so
    they may differ. Record as S4 if so.
  - **Cleanup:** empty the cart.

---

## Failure behaviour

- [ ] **TC-COLL-062** `[LOCAL-ONLY]` — A failed product fetch renders a silent empty grid
  - **Steps:** 1. Block `/api/products` 2. Reload `/collection`
  - **Expect:** "0 items", no cards, **no error message and no retry**.
  - ⚠ **KNOWN** KI-022.
- [ ] **TC-COLL-063** `[LOCAL-ONLY]` — A failed collections fetch removes the tabs
  - **Steps:** 1. Block `/api/collections` 2. Reload
  - **Expect:** only the default tab, products still render, no error.
- [ ] **TC-COLL-064** `[PROD-SAFE]` — The route skeleton shows briefly on navigation
  - **Expect:** a header bar, 4 filter pills and 8 card placeholders. Note it
    disappears when the component mounts — i.e. **before** products have loaded, so
    there is a gap with no loading indicator at all.
- [ ] **TC-COLL-065** `[PROD-SAFE]` — With no published products the page does not crash
  - **Expect:** "0 items", empty grid, tabs still render.
