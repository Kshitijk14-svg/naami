# 02 — Homepage (structure & motion)

Brand loader, hero slideshow, collections showcase, loom timeline, manifesto.
Shopping components on this page are in [`03-homepage-shopping.md`](03-homepage-shopping.md).

All copy and imagery here is admin-driven from `design_settings` with hardcoded
fallbacks. Where a case says "configured", set it in `/admin/design` first.

**Area prefix:** `TC-HOME`

---

## Brand loader

`src/components/BrandLoader.tsx` · runs on **every** homepage mount

- [ ] **TC-HOME-001** `[PROD-SAFE]` — Loader plays on first load
  - **Steps:** 1. Hard-reload `/`
  - **Expect:** a full-screen cream curtain, logo slide-in, text fade with widening
    letter-spacing, a selvedge line drawing, then the curtain splits open. Total
    around 4 seconds.

- [ ] **TC-HOME-002** `[PROD-SAFE]` — The page is not clickable during the loader
  - **Steps:** 1. Reload 2. Immediately try to click the navbar or hero
  - **Expect:** nothing responds until the curtain clears. The overlay captures
    pointer events deliberately.

- [ ] **TC-HOME-003** `[PROD-SAFE]` — The loader replays on every return to `/`
  - **Steps:** 1. Load `/` 2. Navigate to `/collection` 3. Click the wordmark to
    return
  - **Expect:** the full ~4s loader plays again. There is no "seen once" storage.
  - **Note:** if you consider this wrong, it is a product decision, not a bug —
    file as S3 with a recommendation.

- [ ] **TC-HOME-004** `[PROD-SAFE]` — Returning to `/` always lands at the top
  - **Steps:** 1. Scroll far down `/` 2. Navigate to `/about` 3. Press browser Back
  - **Expect:** the homepage opens at the top, not at your previous scroll position.
    `scrollRestoration` is set to manual deliberately.

- [ ] **TC-HOME-005** `[PROD-SAFE]` — The logo renders inside the loader
  - **Expect:** the NAAMI icon is visible, not a blank space. It is drawn to a
    canvas from `/images/naami-icon.png` with near-white pixels stripped; a 404 on
    that image produces a silent blank with no error.

- [ ] **TC-HOME-006** `[PROD-SAFE]` — Reduced motion still lets you reach the page
  - **Pre:** OS set to reduce motion
  - **Expect:** the page becomes usable. Note whether the loader still runs its full
    timeline — if it does, that is worth an S3.

---

## Hero slideshow

`src/components/HomeClient.tsx:277-386` · always exactly 3 slides

- [ ] **TC-HOME-010** `[PROD-SAFE]` — Three slides are configured and render
  - **Pre:** `/admin/design` → Hero Banner, all three slides have an image
  - **Expect:** the first slide shows with its tag, title and subtitle.

- [ ] **TC-HOME-011** `[PROD-SAFE]` — Clicking the right half advances
  - **Steps:** 1. Click anywhere in the right half of the hero
  - **Expect:** the next slide crossfades in and the counter increments.
  - **Note:** the navigation zones are **invisible** — there are no arrows or dots.
    On desktop the cursor label reads NEXT / PREV.

- [ ] **TC-HOME-012** `[PROD-SAFE]` — Clicking the left half goes back
- [ ] **TC-HOME-013** `[PROD-SAFE]` — Navigation wraps in both directions
  - **Steps:** 1. From slide 3 click Next 2. From slide 1 click Prev
  - **Expect:** `01` and `03` respectively.
- [ ] **TC-HOME-014** `[PROD-SAFE]` — The counter reads `0N / 03`
  - **Expect:** leading zeros on both numbers, and the progress bar advances.
- [ ] **TC-HOME-015** `[PROD-SAFE]` — Slide text re-animates on each change
- [ ] **TC-HOME-016** `[PROD-SAFE]` — The text block does not block clicks
  - **Steps:** 1. Click directly on the hero title on the right half
  - **Expect:** the slide still advances — the text is `pointer-events-none`.
- [ ] **TC-HOME-017** `[PROD-SAFE]` — There is no autoplay
  - **Steps:** 1. Load `/` and wait 30 seconds without interacting
  - **Expect:** the slide does not change on its own.
- [ ] **TC-HOME-018** `[PROD-SAFE]` — Keyboard arrows do nothing
  - **Expect:** no keyboard navigation exists. Record as an accessibility gap (S3)
    if you want it.
- [ ] **TC-HOME-019** `[PROD-SAFE]` — Swiping does not change slides on mobile
  - **Expect:** only taps work. There is no swipe gesture despite the swipe hint.

### Hero swipe hint (mobile only)

`src/components/HeroSwipeHint.tsx`

- [ ] **TC-HOME-022** `[PROD-SAFE]` — The hint appears once per session
  - **Steps:** 1. On a phone, open `/` in a fresh session 2. Note the hint
    3. Navigate away and back
  - **Expect:** shown the first time, not again in the same session. Stored under
    `sessionStorage["naami:heroHintSeen"]`.
- [ ] **TC-HOME-023** `[PROD-SAFE]` — The hint auto-dismisses after ~4 seconds
- [ ] **TC-HOME-024** `[PROD-SAFE]` — Any tap in the hero dismisses it immediately
- [ ] **TC-HOME-025** `[PROD-SAFE]` — It reappears in a new session
  - **Steps:** 1. Close all tabs for the site 2. Reopen `/`
- [ ] **TC-HOME-026** `[PROD-SAFE]` — Blocked storage does not break the page
  - **Steps:** 1. Open `/` in a browser with site data blocked
  - **Expect:** the page works; the hint may show every time. The storage access is
    wrapped in try/catch.
- [ ] **TC-HOME-027** `[PROD-SAFE]` — The hint does not appear on desktop

---

## Collections showcase

`src/components/CollectionsShowcase.tsx`

- [ ] **TC-HOME-030** `[PROD-SAFE]` — Desktop: first two are portrait cards, the rest full-width landscape
- [ ] **TC-HOME-031** `[PROD-SAFE]` — Mobile: a horizontal swipe carousel of portrait cards
  - **Note:** native scrollbars are hidden site-wide (KI-045), so there is no visual
    scroll affordance. Confirm swiping still works.
- [ ] **TC-HOME-032** `[PROD-SAFE]` — Each card links to `/collection?collection={id}`
  - **Steps:** 1. Click a collection card 2. Check the URL and the active tab
  - **Expect:** the collection page opens with that collection's tab active.
- [ ] **TC-HOME-033** `[PROD-SAFE]` — Hover scales the image slightly (desktop)
- [ ] **TC-HOME-034** `[PROD-DATA]` — With zero published collections, three demo cards render
  - **Pre:** unpublish every collection (do this off-peak, restore immediately)
  - **Expect:** three hardcoded placeholder collections appear, all linking to bare
    `/collection` because they have no id.
  - **Cleanup:** republish everything.
- [ ] **TC-HOME-035** `[PROD-DATA]` — The side note splits on newlines
  - **Pre:** `/admin/design` → Section Headers → Collections Showcase → Side Note,
    enter three lines
  - **Expect:** three separate rows render.

---

## Loom timeline

`src/components/LoomTimeline.tsx` · **three distinct behaviours** — test all three

- [ ] **TC-HOME-040** `[PROD-SAFE]` — Desktop: the section pins and scrubs horizontally
  - **Pre:** viewport ≥768px, reduced motion **off**
  - **Steps:** 1. Scroll into the section 2. Continue scrolling
  - **Expect:** the section pins in place and the three panels slide horizontally as
    you scroll, snapping at panel boundaries.

- [ ] **TC-HOME-041** `[PROD-SAFE]` — Desktop: panel 2 image fades in, panel 3 gets a crimson reveal
  - **Expect:** panel 3 shows a radial clip-path wipe and the logo pops in.

- [ ] **TC-HOME-042** `[PROD-SAFE]` — Mobile: a native snap swiper, no pinning
  - **Pre:** viewport <768px
  - **Expect:** you swipe the panels sideways; the page does not pin. Panel 3 is
    pre-set to its finished state.

- [ ] **TC-HOME-043** `[PROD-SAFE]` — Reduced motion behaves like mobile even on desktop
  - **Pre:** desktop, reduced motion **on**
  - **Expect:** no pinning, no scrub — the snap swiper.

- [ ] **TC-HOME-044** `[PROD-SAFE]` — The mobile dot indicator tracks the active panel
- [ ] **TC-HOME-045** `[PROD-SAFE]` — Panel 3 has no image field
  - **Expect:** it uses the logo medallion. `/admin/design` → Loom Timeline confirms
    panel 3 offers only Kicker, Title and Body.
- [ ] **TC-HOME-046** `[PROD-SAFE]` — The gold ring does not spin under reduced motion
- [ ] **TC-HOME-047** `[PROD-SAFE]` — Layout survives a font swap
  - **Steps:** 1. Hard-reload with a cold cache 2. Watch the section as fonts load
  - **Expect:** no permanent misalignment — positions are recalculated after
    `document.fonts.ready`.
- [ ] **TC-HOME-048** `[PROD-SAFE]` — Resizing across 768px does not break it
  - **Steps:** 1. Load at 1200px 2. Drag the window down to 500px 3. Scroll through
  - **Expect:** the section still renders and scrolls. Note any stuck pinning.

---

## Manifesto

`src/components/HomeClient.tsx:471-574`

- [ ] **TC-HOME-055** `[PROD-DATA]` — Image, quote and attribution match the admin config
- [ ] **TC-HOME-056** `[PROD-SAFE]` — The block is not clickable
  - **Steps:** 1. Hover it on desktop 2. Click it
  - **Expect:** the cursor reads "EXPLORE" but nothing happens.
  - ⚠ **KNOWN** KI-041 — misleading affordance.

---

## Scroll reveals

`src/components/HomeClient.tsx:195-266`

- [ ] **TC-HOME-060** `[PROD-SAFE]` — Sections fade in as they enter the viewport
- [ ] **TC-HOME-061** `[PROD-SAFE]` — Sections re-hide when scrolled back past
  - **Steps:** 1. Scroll down past a section 2. Scroll back up past it
  - **Expect:** it fades out again. `toggleActions` is
    `play reverse play reverse` — deliberate, but confirm it does not look broken.
- [ ] **TC-HOME-062** `[LOCAL-ONLY]` — A GSAP failure leaves sections invisible
  - **Steps:** 1. Block the GSAP bundle 2. Reload
  - **Expect:** confirm and record what the page looks like. Several sections start
    at inline `opacity: 0`, so a script failure means a blank page rather than an
    unanimated one. Worth knowing the blast radius.
- [ ] **TC-HOME-063** `[PROD-SAFE]` — A very short viewport still reveals everything
  - **Steps:** 1. Set the window to ~500px tall 2. Scroll the whole page
  - **Expect:** every section becomes visible at some point.

---

## Page-level

- [ ] **TC-HOME-070** `[PROD-SAFE]` — The route skeleton shows during navigation
  - **Expect:** a plain cream block, no spinner. Brief.
- [ ] **TC-HOME-071** `[PROD-SAFE]` — No Console errors on a clean load
- [ ] **TC-HOME-072** `[PROD-SAFE]` — No horizontal page scroll at any width
  - **Steps:** 1. Check at 320, 375, 768, 1024, 1440, 1920px
  - **Expect:** the body never scrolls sideways. Carousels scroll internally.
- [ ] **TC-HOME-073** `[PROD-SAFE]` — Every section respects the admin config
  - **Steps:** 1. Change one text field per section in `/admin/design` 2. Wait up to
    5 minutes for the Redis TTL 3. Reload
  - **Expect:** each change appears. Note any section that ignores its setting.
