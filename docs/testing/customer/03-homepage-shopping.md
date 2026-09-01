# 03 — Homepage Shopping Components

The parts of the homepage that put things in the cart: product carousels and their
quick-view, the gateway button, the hotspot banner, hotspot cards, and the shared
moments video carousel.

These contain the highest concentration of known defects on the storefront — read
KI-018 before starting.

**Area prefix:** `TC-HSHOP`

---

## Product carousels (New Arrivals, Bestsellers)

`src/components/ProductCarousel.tsx` · two instances

- [ ] **TC-HSHOP-001** `[PROD-SAFE]` — New Arrivals shows products flagged as such
  - **Pre:** at least three products with **Featured: New Arrival** checked
  - **Expect:** exactly those products appear.

- [ ] **TC-HSHOP-002** `[PROD-SAFE]` — Bestsellers shows products flagged as such

- [ ] **TC-HSHOP-003** `[PROD-SAFE]` — The carousel auto-scrolls slowly
  - **Steps:** 1. Scroll the carousel into view 2. Watch without touching it
  - **Expect:** it drifts leftward continuously and loops seamlessly.

- [ ] **TC-HSHOP-004** `[PROD-SAFE]` — Auto-scroll pauses on hover
- [ ] **TC-HSHOP-005** `[PROD-SAFE]` — Auto-scroll pauses when scrolled out of view
  - **Steps:** 1. Scroll past the carousel 2. Come back after 20 seconds
  - **Expect:** it did not run off into the distance while off-screen.
- [ ] **TC-HSHOP-006** `[PROD-SAFE]` — Clicking the left/right gap steps the carousel
  - **Steps:** 1. Click in the gap **between** two cards on the right side
  - **Expect:** it advances by one card. There are **no visible arrow buttons** on
    this carousel — the zones are invisible.
- [ ] **TC-HSHOP-007** `[PROD-SAFE]` — Clicking a card opens quick-view, not navigation
  - **Expect:** cards sit above the nav zones, so a card click opens the overlay.
- [ ] **TC-HSHOP-008** `[PROD-SAFE]` — Auto-scroll pauses ~1s after a manual step

### Quick-view overlay — desktop

- [ ] **TC-HSHOP-012** `[PROD-SAFE]` — Desktop opens with a book-flip animation
  - **Pre:** viewport ≥768px
  - **Expect:** the cover leaf rotates open and the panel expands from the card's
    position to a centred spread.
- [ ] **TC-HSHOP-013** `[PROD-SAFE]` — Background scroll is locked while open
- [ ] **TC-HSHOP-014** `[PROD-SAFE]` — Backdrop click closes it
- [ ] **TC-HSHOP-015** `[PROD-SAFE]` — The "✕ CLOSE" button closes it
- [ ] **TC-HSHOP-016** `[PROD-SAFE]` — Escape does **not** close it
  - **Expect:** it stays open. Inconsistent with `SizeGuideModal` and `MobileMenu`.
    Record as S3.
- [ ] **TC-HSHOP-017** `[PROD-SAFE]` — Rapid clicking does not break the animation
  - **Steps:** 1. Click a card and immediately click close, repeatedly
  - **Expect:** it settles cleanly, no stuck half-open state.

### Quick-view overlay — mobile

- [ ] **TC-HSHOP-020** `[PROD-SAFE]` — Mobile opens as a bottom sheet
  - **Expect:** slides up from the bottom, max height ~88% of the viewport, with a
    grabber pill at the top.
- [ ] **TC-HSHOP-021** `[PROD-SAFE]` — The grabber pill is decorative
  - **Steps:** 1. Try to swipe the sheet down by the pill
  - **Expect:** nothing happens — there is no swipe-to-dismiss. Close via the
    backdrop or the ✕.
- [ ] **TC-HSHOP-022** `[PROD-SAFE]` — Resizing across 768px with quick-view open
  - **Steps:** 1. Open quick-view at 1200px 2. Drag the window below 768px 3. Close it
  - **Expect:** it closes cleanly. The render branches on a state value while the
    animations read `window.innerWidth` live, so this path is fragile — record
    exactly what happens.

### Quick-view contents

- [ ] **TC-HSHOP-025** `[PROD-SAFE]` — Shows number, name, subtitle, price
- [ ] **TC-HSHOP-026** `[PROD-SAFE]` — Only the **first 3** metafields are shown
  - **Pre:** a product with 5+ metafields
  - **Expect:** three rows. The full list appears only on `/product/{id}`.
- [ ] **TC-HSHOP-027** `[PROD-SAFE]` — Compare-at price shows a strikethrough and `−N%`
- [ ] **TC-HSHOP-028** `[PROD-SAFE]` — "View Full Details ↗" opens the product in a **new tab**
- [ ] **TC-HSHOP-029** `[PROD-DATA]` — There is **no size selector**
  - **Pre:** a product with sizes S, M, L where **S is out of stock**
  - **Steps:** 1. Open its quick-view 2. Click "ADD TO WARDROBE" 3. Open `/cart`
  - **Expect:** the cart line reads `Size: S` — the first size, regardless of stock.
  - ⚠ **KNOWN** KI-018. Confirm the cart then flags it unavailable on the
    availability re-check.
  - **Cleanup:** empty the cart.
- [ ] **TC-HSHOP-030** `[PROD-DATA]` — Adding closes the overlay with no confirmation
  - **Expect:** the overlay closes immediately. No "Added ✓" feedback, unlike the
    product page.
- [ ] **TC-HSHOP-031** `[PROD-SAFE]` — An out-of-stock product disables the button
  - **Expect:** greyed, labelled "OUT OF STOCK", not clickable.
- [ ] **TC-HSHOP-032** `[PROD-DATA]` — The wishlist heart works from a carousel card
  - **Pre:** signed in
  - **Expect:** clicking the heart toggles it **without** opening quick-view.

---

## Gateway button

`src/components/NaamiGatewayButton.tsx` · below each carousel when a label is set

- [ ] **TC-HSHOP-035** `[PROD-SAFE]` — Hover reveals the arch with a wipe
- [ ] **TC-HSHOP-036** `[PROD-SAFE]` — Clicking plays a full-screen transition then navigates
  - **Expect:** the wordmark drops, the arch splits, a cream circle expands from the
    button, then `/collection` loads. Around 1.2 seconds.
- [ ] **TC-HSHOP-037** `[PROD-SAFE]` — Reduced motion navigates immediately
- [ ] **TC-HSHOP-038** `[PROD-SAFE]` — Cmd/Ctrl-click opens `/collection` in a new tab
  - **Expect:** the animation is bypassed and normal browser behaviour applies.
- [ ] **TC-HSHOP-039** `[PROD-SAFE]` — Middle-click also opens a new tab

---

## Hotspot banner

`src/components/HotspotBanner.tsx` · configured under Design → Lookbook Banner

- [ ] **TC-HSHOP-045** `[PROD-SAFE]` — The banner image scales slightly as you scroll
- [ ] **TC-HSHOP-046** `[PROD-SAFE]` — Desktop: hovering a rivet opens its card
- [ ] **TC-HSHOP-047** `[PROD-SAFE]` — The rivet drags toward the pointer
  - **Expect:** a subtle magnet effect while the pointer is over it.
- [ ] **TC-HSHOP-048** `[PROD-SAFE]` — Moving away closes the card with a spring
- [ ] **TC-HSHOP-049** `[PROD-SAFE]` — Mobile: tapping a rivet toggles its card
  - **Expect:** tap opens, tap again closes. This is the only mobile path — there is
    no hover.
- [ ] **TC-HSHOP-050** `[PROD-SAFE]` — The card shows number, product name and price
- [ ] **TC-HSHOP-051** `[PROD-DATA]` — "ADD TO CART" adds with size `"One Size"`
  - **Pre:** a hotspot pointing at a product that **has** sizes
  - **Steps:** 1. Open the hotspot 2. Add to cart 3. Open `/cart`
  - **Expect:** the line reads `Size: One Size` — the real sizes are ignored.
  - ⚠ **KNOWN** KI-018. Then confirm what the availability check reports for that
    nonexistent size.
  - **Cleanup:** empty the cart.
- [ ] **TC-HSHOP-052** `[PROD-DATA]` — A hotspot with no product shows "Item unavailable"
  - **Pre:** a hotspot with `— Select product —` left unset
- [ ] **TC-HSHOP-053** `[PROD-DATA]` — Unconfigured, a fallback banner with 3 dead hotspots renders
  - **Pre:** no lookbook banner configured
  - **Expect:** a placeholder image and three hotspots all reading "Item
    unavailable".

---

## Hotspot cards ("Shop The Look")

`src/components/HotspotCards.tsx`

- [ ] **TC-HSHOP-058** `[PROD-SAFE]` — Prev/Next arrow buttons are visible and work
  - **Note:** unlike the product carousel, this one has real buttons.
- [ ] **TC-HSHOP-059** `[PROD-SAFE]` — The Next arrow icon is drawn correctly
  - **Expect:** a clean arrow. ⚠ **KNOWN** KI-040 — the SVG path is malformed, so
    expect a broken arrowhead.
- [ ] **TC-HSHOP-060** `[PROD-SAFE]` — Arrows scroll by a fixed amount
  - **Steps:** 1. Click Next repeatedly to the end
  - **Expect:** it stops at the end without overscrolling. The step is hardcoded
    (440px desktop / 340px mobile) rather than measured, so with unusual card widths
    it may not land cleanly — record what you see.
- [ ] **TC-HSHOP-061** `[PROD-SAFE]` — Each card shows title, subtitle and a 4:5 image
- [ ] **TC-HSHOP-062** `[PROD-SAFE]` — Card hotspots behave like the banner's
- [ ] **TC-HSHOP-063** `[PROD-DATA]` — "ADD TO CART" also forces `"One Size"` ⚠ **KNOWN** KI-018
- [ ] **TC-HSHOP-064** `[PROD-DATA]` — Unconfigured, three fallback cards with dead hotspots render

---

## Shared moments (video carousel)

`src/components/SharedMomentsCarousel.tsx` · section is conditional

- [ ] **TC-HSHOP-070** `[PROD-DATA]` — The section is hidden when disabled
  - **Pre:** `/admin/design` → Shared Moments → uncheck "Show this section"
  - **Expect:** the whole section is absent from `/`.
- [ ] **TC-HSHOP-071** `[PROD-DATA]` — The section is hidden when enabled but empty
  - **Pre:** enabled, but zero videos
  - **Expect:** still absent — it needs both the flag **and** at least one item.
- [ ] **TC-HSHOP-072** `[PROD-SAFE]` — Prev/Next buttons scroll the track
- [ ] **TC-HSHOP-073** `[PROD-SAFE]` — Desktop: click-drag scrolls the carousel
  - **Steps:** 1. Press and drag horizontally across the cards
  - **Expect:** the track follows the pointer; the cursor label reads DRAGGING.
- [ ] **TC-HSHOP-074** `[PROD-SAFE]` — A drag does not trigger a click
  - **Steps:** 1. Press on a card's play button, drag 50px, release
  - **Expect:** the video does **not** start playing.
- [ ] **TC-HSHOP-075** `[PROD-SAFE]` — A plain click still reaches the play button
  - **Steps:** 1. Click the play button without moving
  - **Expect:** the video plays.
- [ ] **TC-HSHOP-076** `[PROD-SAFE]` — Mobile uses native scrolling
- [ ] **TC-HSHOP-077** `[PROD-SAFE]` — Only one clip plays at a time
  - **Steps:** 1. Play video 1 2. Play video 2
  - **Expect:** video 1 pauses automatically.
- [ ] **TC-HSHOP-078** `[PROD-SAFE]` — Scrolling a playing clip out of view pauses it
  - **Expect:** it pauses and does **not** auto-resume when scrolled back.
- [ ] **TC-HSHOP-079** `[PROD-SAFE]` — Videos start unmuted
  - **Steps:** 1. Load `/` with sound on 2. Play a clip
  - **Expect:** confirm whether audio plays. Note that browsers block unmuted
    autoplay, but this is a user-initiated play so it should be audible. If a
    storefront should default to muted, record it as S3.
- [ ] **TC-HSHOP-080** `[PROD-SAFE]` — The speaker toggle appears only while playing
  - **Expect:** no mute control on a paused card.
- [ ] **TC-HSHOP-081** `[PROD-SAFE]` — The mute preference is shared across cards
  - **Steps:** 1. Mute video 1 2. Play video 2
  - **Expect:** video 2 is also muted.
- [ ] **TC-HSHOP-082** `[PROD-DATA]` — A video with no URL falls back to a still image
  - **Expect:** a plain thumbnail with no play control.
- [ ] **TC-HSHOP-083** `[PROD-SAFE]` — Captions appear on hover, clamped to 2 lines
  - **Pre:** a video with a long caption
- [ ] **TC-HSHOP-084** `[PROD-SAFE]` — Tape, pin and tilt are stable across reloads
  - **Steps:** 1. Note the decoration on each card 2. Reload
  - **Expect:** identical — the decorations are hashed from the item id, not random.
- [ ] **TC-HSHOP-085** `[LOCAL-ONLY]` — A codec failure fails silently
  - **Steps:** 1. Upload a video the browser cannot decode 2. Press play
  - **Expect:** nothing happens, no error shown. Confirm and record — the play
    promise rejection is swallowed.
- [ ] **TC-HSHOP-086** `[PROD-SAFE]` — The Next arrow icon is broken here too ⚠ **KNOWN** KI-040
- [ ] **TC-HSHOP-087** `[PROD-DATA]` — Videos appear in sort-order sequence
  - **Pre:** three videos with sort orders 2, 0, 1
  - **Expect:** they render 0, 1, 2 left to right.
