# 33 — Motion & Accessibility

This site leans heavily on scroll-driven animation, and several sections start at
`opacity: 0` in inline styles — meaning **a script failure produces a blank page,
not an unanimated one**. That risk is the main reason this file exists.

**Area prefix:** `TC-A11Y`

---

## Reduced motion

Enable it first: macOS System Settings → Accessibility → Display → Reduce motion.
Windows → Settings → Accessibility → Visual effects → Animation effects off.

- [ ] **TC-A11Y-001** `[PROD-SAFE]` — All content is reachable with reduced motion on
  - **Steps:** browse the whole site with it enabled
  - **Expect:** nothing is hidden or unreachable.
- [ ] **TC-A11Y-002** `[PROD-SAFE]` — The header transition is removed
- [ ] **TC-A11Y-003** `[PROD-SAFE]` — The mobile menu opens instantly with no slide
- [ ] **TC-A11Y-004** `[PROD-SAFE]` — The loom timeline uses the snap swiper, not the pinned scrub
  - **Expect:** even on desktop.
- [ ] **TC-A11Y-005** `[PROD-SAFE]` — The gateway button navigates immediately
- [ ] **TC-A11Y-006** `[PROD-SAFE]` — The gold ring on loom panel 3 does not spin
- [ ] **TC-A11Y-007** `[PROD-SAFE]` — The hero swipe hint chevrons do not bob
- [ ] **TC-A11Y-008** `[PROD-SAFE]` — The brand loader behaviour is recorded
  - **Steps:** 1. Reduced motion on 2. Hard-reload `/`
  - **Expect:** record whether the ~4s loader still plays in full. If it does, that
    is worth an S3 — a 4-second blocking animation is exactly what reduced motion
    is meant to suppress.
- [ ] **TC-A11Y-009** `[PROD-SAFE]` — Scroll reveals still show content
  - **Expect:** sections must become visible. If they stay at `opacity: 0`, that is
    **S1** — the site would be unusable for these users.

---

## Script failure resilience

- [ ] **TC-A11Y-013** `[LOCAL-ONLY]` — **Blocking GSAP on `/`**
  - **Steps:** 1. DevTools → Network → block the GSAP bundle 2. Reload `/`
  - **Expect:** record precisely what renders. Several homepage sections start at
    inline `opacity: 0`. A blank or half-blank homepage is a real risk if that CDN
    or chunk ever fails.
- [ ] **TC-A11Y-014** `[LOCAL-ONLY]` — Blocking GSAP on `/collection`
  - **Expect:** the product grid may be entirely invisible — every card starts at
    `opacity: 0`.
- [ ] **TC-A11Y-015** `[LOCAL-ONLY]` — Blocking GSAP on `/about`
  - **Expect:** likely a near-blank page.
- [ ] **TC-A11Y-016** `[LOCAL-ONLY]` — The navbar with GSAP blocked
  - **Expect:** it starts at `opacity: 0` and is faded in by script — record whether
    it is invisible.
- [ ] **TC-A11Y-017** `[LOCAL-ONLY]` — The custom cursor with its script broken
  - **Expect:** the component sets `cursor: none !important` globally. If it fails
    after that, the site has **no visible cursor at all**. Record the failure mode.
- [ ] **TC-A11Y-018** `[LOCAL-ONLY]` — JavaScript disabled entirely
  - **Steps:** 1. Disable JS 2. Load `/`, `/collection`, `/product/{id}`
  - **Expect:** record what renders. This is an SEO and resilience data point rather
    than a supported mode.

---

## Keyboard navigation

- [ ] **TC-A11Y-022** `[PROD-SAFE]` — Tab reaches every navbar link
- [ ] **TC-A11Y-023** `[PROD-SAFE]` — Focus is visible throughout
  - **Steps:** tab through a page and watch for a focus ring
  - **Expect:** always visible. Missing focus indicators are an S2 accessibility
    defect.
- [ ] **TC-A11Y-024** `[PROD-SAFE]` — Tab order follows visual order
- [ ] **TC-A11Y-025** `[PROD-SAFE]` — Every checkout field is reachable by Tab
- [ ] **TC-A11Y-026** `[PROD-SAFE]` — The checkout form can be submitted by keyboard
- [ ] **TC-A11Y-027** `[PROD-SAFE]` — Auth forms are fully keyboard-operable
- [ ] **TC-A11Y-028** `[PROD-SAFE]` — Cart quantity steppers are keyboard-activatable
- [ ] **TC-A11Y-029** `[PROD-SAFE]` — Size selector buttons are reachable and activatable
- [ ] **TC-A11Y-030** `[PROD-SAFE]` — **The footer accordion cannot be opened by keyboard**
  - **Steps:** 1. Tab to a footer column header 2. Press Enter, then Space
  - **Expect:** nothing happens. ⚠ **KNOWN** KI-046 — `role="button" tabIndex={0}`
    with no key handler. Confirm it still reproduces.
- [ ] **TC-A11Y-031** `[PROD-SAFE]` — Feedback stars cannot be set by keyboard
  - **Expect:** confirm — no arrow-key support. Record as an accessibility gap.
- [ ] **TC-A11Y-032** `[PROD-SAFE]` — Hero slides cannot be changed by keyboard
- [ ] **TC-A11Y-033** `[PROD-SAFE]` — Admin tables are keyboard-navigable
- [ ] **TC-A11Y-034** `[PROD-SAFE]` — No keyboard trap anywhere
  - **Steps:** tab through every page including with modals open
  - **Expect:** you can always tab out.

## Modal keyboard behaviour

Inconsistent across the app — record each.

| Modal | Escape closes? |
|---|---|
| SizeGuideModal | ✅ expected |
| MobileMenu | ✅ expected |
| Admin CrudModal | ✅ expected |
| Collection product modal | ❌ known gap |
| Carousel quick-view | ❌ known gap |
| Blog modal | ❌ known gap |
| ProfileDropdown | ❌ known gap |

- [ ] **TC-A11Y-038** `[PROD-SAFE]` — Verify every row of that table
- [ ] **TC-A11Y-039** `[PROD-SAFE]` — Focus moves into a modal when it opens
- [ ] **TC-A11Y-040** `[PROD-SAFE]` — Focus returns to the trigger when it closes
- [ ] **TC-A11Y-041** `[PROD-SAFE]` — Tab is trapped inside an open modal
  - **Expect:** record any modal where tabbing escapes to the page behind.

---

## Screen reader

Test with VoiceOver (⌘F5 on macOS) or NVDA on Windows.

- [ ] **TC-A11Y-045** `[PROD-SAFE]` — Page titles are announced and meaningful
- [ ] **TC-A11Y-046** `[PROD-SAFE]` — Headings form a sensible hierarchy
  - **Expect:** one `h1` per page, no skipped levels.
- [ ] **TC-A11Y-047** `[PROD-SAFE]` — Product images have meaningful alt text
  - **Expect:** not "image" or empty for content images.
- [ ] **TC-A11Y-048** `[PROD-SAFE]` — Decorative images are hidden from the reader
- [ ] **TC-A11Y-049** `[PROD-SAFE]` — Form labels are correctly associated
  - **Steps:** tab through checkout with the reader on
  - **Expect:** each field's label is announced.
- [ ] **TC-A11Y-050** `[PROD-SAFE]` — Buttons have accessible names
  - **Expect:** icon-only buttons — wishlist heart, video play, hotspot rivets,
    carousel arrows — all announce something meaningful.
- [ ] **TC-A11Y-051** `[PROD-SAFE]` — Error messages are announced
  - **Steps:** submit the checkout form with an invalid phone
  - **Expect:** the error is announced, not just shown visually.
- [ ] **TC-A11Y-052** `[PROD-SAFE]` — The cart badge count is announced
- [ ] **TC-A11Y-053** `[PROD-SAFE]` — Status changes are announced
  - **Steps:** add to cart with the reader on
  - **Expect:** the "ADDED TO WARDROBE ✓" state change is conveyed.

---

## Colour & contrast

- [ ] **TC-A11Y-057** `[PROD-SAFE]` — Body text meets 4.5:1 contrast
  - **Steps:** DevTools → Elements → inspect a text node → check the contrast ratio
  - **Expect:** ≥4.5:1. The site uses a lot of `rgba(17,17,17,0.45)` for small
    labels — check those specifically.
- [ ] **TC-A11Y-058** `[PROD-SAFE]` — Large text meets 3:1
- [ ] **TC-A11Y-059** `[PROD-SAFE]` — Interactive elements meet 3:1 against their background
- [ ] **TC-A11Y-060** `[PROD-SAFE]` — Error text is legible
- [ ] **TC-A11Y-061** `[PROD-SAFE]` — Status is not conveyed by colour alone
  - **Steps:** view the admin orders list in greyscale
  - **Expect:** each status is still identifiable by its text label. Note that on
    the customer profile, four of five statuses share a colour anyway (KI-023
    neighbourhood) — so text is doing all the work there.
- [ ] **TC-A11Y-062** `[PROD-SAFE]` — Disabled controls are visibly distinct
- [ ] **TC-A11Y-063** `[PROD-SAFE]` — Out-of-stock sizes are distinguishable without colour
  - **Expect:** the strikethrough carries the meaning, not just the grey.

---

## Zoom & text scaling

- [ ] **TC-A11Y-067** `[PROD-SAFE]` — 200% browser zoom remains usable
  - **Steps:** Ctrl/⌘ + several times, then browse
  - **Expect:** no horizontal scroll, no clipped content, all controls reachable.
- [ ] **TC-A11Y-068** `[PROD-SAFE]` — 400% zoom does not break the checkout form
- [ ] **TC-A11Y-069** `[PROD-SAFE]` — Larger OS text size is handled
  - **Steps:** set the phone's text size to maximum and browse
- [ ] **TC-A11Y-070** `[PROD-SAFE]` — No content is lost at high zoom on mobile
