# 30 — Responsive & Device

**Highest-priority cross-cutting file.** The most recent commits before the
security work were all mobile fixes — mobile view design, footer, navbar scroll,
shared-moments sizing, product carousel — so this is where regressions are most
likely.

Several components branch on `pointer: coarse` or a live `window.innerWidth` read,
which the DevTools device toolbar does **not** reproduce faithfully. **Test on at
least one real phone.**

**Area prefix:** `TC-RSP`

---

## Viewports to cover

| Width | Represents | Priority |
|---|---|---|
| **320px** | iPhone SE 1st gen — the narrowest realistic | High |
| **375px** | iPhone SE / 13 mini | **Critical** |
| **390px** | iPhone 14/15 | **Critical** |
| **430px** | iPhone Pro Max | High |
| **768px** | iPad portrait — **the breakpoint boundary** | **Critical** |
| **1024px** | iPad landscape | Medium |
| **1440px** | Laptop | High |
| **1920px** | Desktop | Medium |

768px is the single most important width — nearly every component switches
behaviour there.

---

## Every page, every width

For each page below, at 375px, 768px and 1440px, confirm: no horizontal body
scroll, no clipped text, no overlapping elements, all controls reachable and
tappable.

- [ ] **TC-RSP-001** `[PROD-SAFE]` — `/` homepage
- [ ] **TC-RSP-002** `[PROD-SAFE]` — `/collection`
- [ ] **TC-RSP-003** `[PROD-SAFE]` — `/product/{id}`
- [ ] **TC-RSP-004** `[PROD-SAFE]` — `/cart` (with items)
- [ ] **TC-RSP-005** `[PROD-SAFE]` — `/checkout`
- [ ] **TC-RSP-006** `[PROD-SAFE]` — `/auth` — all three modes
- [ ] **TC-RSP-007** `[PROD-SAFE]` — `/profile` — all three tabs
- [ ] **TC-RSP-008** `[PROD-SAFE]` — `/orders/{id}`
- [ ] **TC-RSP-009** `[PROD-SAFE]` — `/journal` and a post
- [ ] **TC-RSP-010** `[PROD-SAFE]` — `/about`
- [ ] **TC-RSP-011** `[PROD-SAFE]` — `/admin` and each admin page

---

## Horizontal overflow

The most common responsive defect. Check deliberately.

- [ ] **TC-RSP-015** `[PROD-SAFE]` — No page scrolls horizontally at 320px
  - **Steps:** on each page, try to swipe/drag the **body** sideways
  - **Expect:** it does not move. Carousels scroll internally; the page must not.
- [ ] **TC-RSP-016** `[PROD-SAFE]` — Wide tables scroll inside their container
  - **Steps:** check `/admin/orders`, `/admin/products`, `/admin/coupons` at 375px
  - **Expect:** the table scrolls, the page does not.
- [ ] **TC-RSP-017** `[PROD-SAFE]` — The size guide table scrolls inside its modal
- [ ] **TC-RSP-018** `[PROD-SAFE]` — Long product names wrap rather than overflow
- [ ] **TC-RSP-019** `[PROD-SAFE]` — Long emails in admin tables do not break layout
- [ ] **TC-RSP-020** `[PROD-SAFE]` — The collection tab strip scrolls, the page does not

---

## The 768px boundary

Every component that changes behaviour there.

- [ ] **TC-RSP-024** `[PROD-SAFE]` — Navbar links appear at ≥768px, vanish below
- [ ] **TC-RSP-025** `[PROD-SAFE]` — The hamburger appears below 768px only
- [ ] **TC-RSP-026** `[PROD-SAFE]` — The desktop cart icon and badge hide below 768px
- [ ] **TC-RSP-027** `[PROD-SAFE]` — The profile dropdown is desktop-only; mobile uses the drawer
- [ ] **TC-RSP-028** `[PROD-SAFE]` — The custom cursor appears only on fine pointers
- [ ] **TC-RSP-029** `[PROD-SAFE]` — The desktop search bar hides; the drawer search appears
- [ ] **TC-RSP-030** `[PROD-SAFE]` — Loom timeline: pinned scrub above, snap swiper below
- [ ] **TC-RSP-031** `[PROD-SAFE]` — Collections showcase: mixed layout above, carousel below
- [ ] **TC-RSP-032** `[PROD-SAFE]` — Quick-view: book-flip above, bottom sheet below
- [ ] **TC-RSP-033** `[PROD-SAFE]` — The hero swipe hint appears below 768px only
- [ ] **TC-RSP-034** `[PROD-SAFE]` — **Resizing across 768px does not break anything**
  - **Steps:** 1. Load `/` at 1200px 2. Slowly drag the window to 400px and back
    3. Scroll the whole page at each end
  - **Expect:** no stuck pinning, no invisible sections, no console errors. This is
    the most fragile path in the app.
- [ ] **TC-RSP-035** `[PROD-SAFE]` — Rotating a real device between portrait and landscape

---

## Touch interaction

**Real device required** — the device toolbar does not fire touch handlers the same
way.

- [ ] **TC-RSP-039** `[PROD-SAFE]` — Hero slides advance on tap
- [ ] **TC-RSP-040** `[PROD-SAFE]` — Hotspot rivets toggle on tap
  - **Note:** there is no hover on touch, so tap is the only path.
- [ ] **TC-RSP-041** `[PROD-SAFE]` — Hotspot cards' hotspots also toggle on tap
- [ ] **TC-RSP-042** `[PROD-SAFE]` — Product carousels swipe smoothly
- [ ] **TC-RSP-043** `[PROD-SAFE]` — The collections showcase swipes
- [ ] **TC-RSP-044** `[PROD-SAFE]` — The loom timeline swipes and snaps
- [ ] **TC-RSP-045** `[PROD-SAFE]` — Shared moments scrolls natively on touch
- [ ] **TC-RSP-046** `[PROD-SAFE]` — Video play/pause works by tap
- [ ] **TC-RSP-047** `[PROD-SAFE]` — The hotspot editor supports touch dragging
- [ ] **TC-RSP-048** `[PROD-SAFE]` — The doodle canvas draws with a finger
- [ ] **TC-RSP-049** `[PROD-SAFE]` — Product image thumbnails are tappable
- [ ] **TC-RSP-050** `[PROD-SAFE]` — Modals close by tapping the backdrop

---

## Tap targets

- [ ] **TC-RSP-054** `[PROD-SAFE]` — Cart quantity steppers are comfortably tappable
  - **Steps:** on a real phone, tap "+" and "−" ten times each
  - **Expect:** no mis-taps. Record if they feel under 44px.
- [ ] **TC-RSP-055** `[PROD-SAFE]` — Size selector buttons are large enough
- [ ] **TC-RSP-056** `[PROD-SAFE]` — The wishlist heart is tappable without hitting the image
- [ ] **TC-RSP-057** `[PROD-SAFE]` — "Remove" links in the cart are not too close to the steppers
- [ ] **TC-RSP-058** `[PROD-SAFE]` — Admin table Edit/Delete are distinguishable by thumb
  - **Expect:** they sit adjacent — check you cannot easily hit Delete instead of
    Edit. **If you can, record as S2** given Delete is destructive.
- [ ] **TC-RSP-059** `[PROD-SAFE]` — Hotspot rivets are tappable but not accidentally

---

## Mobile-specific layout

- [ ] **TC-RSP-063** `[PROD-SAFE]` — The checkout form is single-column below `md`
- [ ] **TC-RSP-064** `[PROD-SAFE]` — The cart summary stacks below the items
- [ ] **TC-RSP-065** `[PROD-SAFE]` — The product page stacks image above details
- [ ] **TC-RSP-066** `[PROD-SAFE]` — The collection grid is 2 columns on mobile
- [ ] **TC-RSP-067** `[PROD-SAFE]` — The wishlist grid is 2 columns on mobile
- [ ] **TC-RSP-068** `[PROD-SAFE]` — The journal grid is 1 column on mobile
- [ ] **TC-RSP-069** `[PROD-SAFE]` — The admin sidebar becomes a drawer
- [ ] **TC-RSP-070** `[PROD-SAFE]` — Footer accordions are usable at 320px

---

## Mobile browser quirks

- [ ] **TC-RSP-074** `[PROD-SAFE]` — Full-height elements handle the browser chrome
  - **Steps:** 1. On iOS Safari, scroll so the address bar collapses 2. Check the
    hero and any 100vh section
  - **Expect:** no jump or gap. `100dvh` is used in the mobile menu; confirm other
    full-height areas behave.
- [ ] **TC-RSP-075** `[PROD-SAFE]` — Body scroll lock works on iOS
  - **Steps:** 1. Open the mobile menu on iOS Safari 2. Try to scroll behind it
  - **Expect:** the page underneath does not move — iOS is historically bad at this.
- [ ] **TC-RSP-076** `[PROD-SAFE]` — The same for the quick-view sheet and modals
- [ ] **TC-RSP-077** `[PROD-SAFE]` — Focusing an input does not break layout
  - **Steps:** 1. On a phone, tap into a checkout field 2. Watch as the keyboard
    opens
  - **Expect:** the field stays visible and nothing is pushed off-screen.
- [ ] **TC-RSP-078** `[PROD-SAFE]` — No unwanted zoom on input focus
  - **Expect:** iOS zooms when a font-size is under 16px. Record any field that
    triggers it.
- [ ] **TC-RSP-079** `[PROD-SAFE]` — Pull-to-refresh does not conflict with carousels

---

## Cross-browser

- [ ] **TC-RSP-083** `[PROD-SAFE]` — Chrome desktop — full pass
- [ ] **TC-RSP-084** `[PROD-SAFE]` — Safari desktop — full pass
- [ ] **TC-RSP-085** `[PROD-SAFE]` — Firefox desktop — full pass
- [ ] **TC-RSP-086** `[PROD-SAFE]` — iOS Safari — the customer journey end to end
- [ ] **TC-RSP-087** `[PROD-SAFE]` — Android Chrome — the customer journey end to end
- [ ] **TC-RSP-088** `[PROD-SAFE]` — The Razorpay popup works on iOS Safari
  - **Note:** popups and third-party iframes are where mobile Safari differs most.
    Test this specifically rather than assuming.
