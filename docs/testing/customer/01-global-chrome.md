# 01 — Global Chrome

Everything that renders on every customer page: announcement bar, header, navbar,
search, profile dropdown, mobile menu, footer, custom cursor, scroll ribbon.

Run this first — a fault here affects every other checklist.

**Area prefix:** `TC-CHR`

---

## Announcement bar

`src/components/AnnouncementBar.tsx` · `GET /api/design/announcements`

- [ ] **TC-CHR-001** `[PROD-SAFE]` — Bar renders when at least one slot is enabled
  - **Steps:** 1. Load `/` 2. Look above the navbar
  - **Expect:** a thin bar with the configured text, pinned above the navigation.

- [ ] **TC-CHR-002** `[PROD-SAFE]` — A slot with a link is clickable
  - **Pre:** a slot has a `link` value set in `/admin/design` → Announcements
  - **Steps:** 1. Click the announcement text
  - **Expect:** navigates to the configured path. A slot with no link is plain text
    and does not respond to clicks.

- [ ] **TC-CHR-003** `[PROD-DATA]` — Two enabled slots cross-fade every 4.5s
  - **Pre:** both slots enabled with different text
  - **Steps:** 1. Load `/` 2. Watch the bar for 15 seconds
  - **Expect:** the text alternates roughly every 4.5 seconds with a fade.
  - **Cleanup:** restore the original slot configuration.

- [ ] **TC-CHR-004** `[PROD-DATA]` — A single enabled slot is static
  - **Expect:** no rotation, no flicker. Rotation only runs with ≥2 enabled slots.

- [ ] **TC-CHR-005** `[PROD-DATA]` — A slot with blank text is dropped
  - **Pre:** slot 1 enabled but its text cleared
  - **Expect:** that slot never displays. Server filters on `enabled === "true"`
    **and** non-blank text.

- [ ] **TC-CHR-006** `[PROD-SAFE]` — Bar is absent on `/auth` and `/admin`
  - **Expect:** no announcement bar on either.

- [ ] **TC-CHR-007** `[LOCAL-ONLY]` — API failure hides the bar silently
  - **Steps:** 1. Block `/api/design/announcements` in DevTools → Network → Block
    request URL 2. Reload
  - **Expect:** no bar, no error, no layout gap. The page is otherwise normal.

---

## Header scroll behaviour

`src/components/SiteHeader.tsx:59-81`

- [ ] **TC-CHR-010** `[PROD-SAFE]` — Navbar hides on scroll down past 80px
  - **Steps:** 1. Load `/` 2. Scroll down slowly past 80px, then continue
  - **Expect:** the navbar slides up out of view. The **announcement bar stays
    pinned** — only the navbar translates.

- [ ] **TC-CHR-011** `[PROD-SAFE]` — Navbar reveals on any scroll up
  - **Expect:** scrolling up by more than 6px brings it straight back.

- [ ] **TC-CHR-012** `[PROD-SAFE]` — Small scroll jitters do not toggle it
  - **Steps:** 1. Scroll in 2–3px increments
  - **Expect:** no flicker. Deltas under 6px are ignored.

- [ ] **TC-CHR-013** `[PROD-SAFE]` — Navbar never hides in the top 80px
  - **Steps:** 1. From the top, scroll down 40px
  - **Expect:** still visible.

- [ ] **TC-CHR-014** `[PROD-SAFE]` — Navigating re-reveals a hidden navbar
  - **Steps:** 1. Scroll down until hidden 2. Use browser Back/Forward
  - **Expect:** the navbar is visible on the new route.

- [ ] **TC-CHR-015** `[PROD-SAFE]` — Reduced motion removes the transition
  - **Pre:** OS set to reduce motion
  - **Expect:** the navbar snaps rather than animating over 320ms.

- [ ] **TC-CHR-016** `[PROD-SAFE]` — Content is not hidden behind the header
  - **Steps:** 1. Load each page 2. Confirm the first heading is fully visible
  - **Expect:** no overlap. Height is published as `--site-header-h` and pages pad
    by it, so this must hold at every viewport width including when the
    announcement bar wraps to two lines.

---

## Navbar

`src/components/Navbar.tsx`

- [ ] **TC-CHR-020** `[PROD-SAFE]` — Wordmark links home
- [ ] **TC-CHR-021** `[PROD-SAFE]` — Home / Collections / About / Journal all navigate correctly
  - **Note:** all four are `hidden md:block` — below 768px they are only in the
    mobile menu.
- [ ] **TC-CHR-022** `[PROD-SAFE]` — Logged out shows "Sign In"; logged in shows the avatar
- [ ] **TC-CHR-023** `[PROD-SAFE]` — Cart badge shows only when count > 0
  - **Steps:** 1. Empty cart → check 2. Add an item → check
  - **Expect:** no badge at 0; the correct count otherwise. Desktop only
    (`hidden md:flex`).
- [ ] **TC-CHR-024** `[PROD-SAFE]` — Cart badge survives a reload
  - **Expect:** count persists — the cart is in `localStorage` under `naami_cart`.
- [ ] **TC-CHR-025** `[PROD-SAFE]` — A separator pipe appears only on product pages
- [ ] **TC-CHR-026** `[PROD-SAFE]` — Navbar is absent on `/auth` and `/admin`
- [ ] **TC-CHR-027** `[PROD-SAFE]` — Homepage navbar entrance is delayed ~3.4s
  - **Steps:** 1. Hard-reload `/`
  - **Expect:** the navbar fades in after the brand loader finishes. On every other
    page it appears almost immediately (0.1s).
  - **Note:** it starts at `opacity: 0` — if it never appears, GSAP failed. Check
    the Console.
- [ ] **TC-CHR-028** `[PROD-SAFE]` — Sign-out from the navbar returns to `/`
  - **Expect:** signed out, redirected to `/`, and the navbar shows "Sign In".
  - **Note:** the cart is **not** cleared by signing out.

---

## Search

`src/components/NavSearch.tsx` · `GET /api/search?q=`

- [ ] **TC-CHR-030** `[PROD-SAFE]` — Fewer than 2 characters does nothing
  - **Steps:** 1. Type `a` 2. Watch the Network tab
  - **Expect:** no request is made, no dropdown opens.

- [ ] **TC-CHR-031** `[PROD-SAFE]` — 2+ characters searches after a pause
  - **Expect:** exactly one request fires ~300ms after you stop typing, not one per
    keystroke.

- [ ] **TC-CHR-032** `[PROD-SAFE]` — Results show thumbnail, name, subtitle, price
- [ ] **TC-CHR-033** `[PROD-SAFE]` — Clicking a result opens that product and closes the dropdown
- [ ] **TC-CHR-034** `[PROD-SAFE]` — No matches shows `No results for "<query>"`
- [ ] **TC-CHR-035** `[PROD-SAFE]` — Clicking outside closes the dropdown
- [ ] **TC-CHR-036** `[PROD-SAFE]` — The × button clears query and results
- [ ] **TC-CHR-037** `[PROD-SAFE]` — Refocusing reopens results if any exist
- [ ] **TC-CHR-038** `[PROD-SAFE]` — Whitespace-only input is treated as empty
  - **Steps:** 1. Type three spaces
  - **Expect:** no request — the length check runs after trimming.
- [ ] **TC-CHR-039** `[PROD-SAFE]` — Unpublished products never appear in results
- [ ] **TC-CHR-040** `[PROD-SAFE]` — A search for `%` does not return everything
  - **Steps:** 1. Search `%%`
  - **Expect:** treated as a literal string, not a wildcard. If it returns the whole
    catalogue, file it as **S2** — `%` is not escaped before `ilike`.
- [ ] **TC-CHR-041** `[LOCAL-ONLY]` — A failed search leaves no stale dropdown
  - **Steps:** 1. Search successfully 2. Block `/api/search` 3. Type more
  - **Expect:** the dropdown should not keep showing the old results.
  - ⚠ **KNOWN** — the catch clears results but leaves `isOpen` untouched.

---

## Profile dropdown (desktop only)

`src/components/ProfileDropdown.tsx` · `hidden md:block`

- [ ] **TC-CHR-045** `[PROD-SAFE]` — Avatar shows the first letter of name, else email, uppercased
- [ ] **TC-CHR-046** `[PROD-SAFE]` — Panel shows name, email and role badge
- [ ] **TC-CHR-047** `[PROD-SAFE]` — "My Profile" navigates to `/profile`
- [ ] **TC-CHR-048** `[PROD-SAFE]` — "Admin Dashboard" appears **only** for staff/admin/super_admin
  - **Steps:** 1. Check as customer 2. Check as staff
  - **Expect:** absent for customer, present for staff.
- [ ] **TC-CHR-049** `[PROD-SAFE]` — Clicking outside closes it
- [ ] **TC-CHR-050** `[PROD-SAFE]` — Escape does **not** close it
  - **Expect:** it stays open. Inconsistent with `SizeGuideModal` and `MobileMenu`,
    which both handle Escape. File as **S4** if you want consistency.

---

## Mobile menu

`src/components/MobileMenu.tsx` · `md:hidden` · **test on a real phone**

- [ ] **TC-CHR-055** `[PROD-SAFE]` — Hamburger opens a right-side drawer
- [ ] **TC-CHR-056** `[PROD-SAFE]` — Background scroll is locked while open
  - **Steps:** 1. Open the menu 2. Try to scroll the page behind it
  - **Expect:** the page does not move.
- [ ] **TC-CHR-057** `[PROD-SAFE]` — Scroll is restored on close
- [ ] **TC-CHR-058** `[PROD-SAFE]` — Closes via scrim tap
- [ ] **TC-CHR-059** `[PROD-SAFE]` — Closes via the ✕ button
- [ ] **TC-CHR-060** `[PROD-SAFE]` — Closes via Escape (external keyboard)
- [ ] **TC-CHR-061** `[PROD-SAFE]` — Tapping any nav link closes it and navigates
- [ ] **TC-CHR-062** `[PROD-SAFE]` — Contains search, all nav links and the cart with its badge
- [ ] **TC-CHR-063** `[PROD-SAFE]` — Signed in shows name, email, role badge, My Profile, Sign Out
- [ ] **TC-CHR-064** `[PROD-SAFE]` — Signed out shows only "Sign In"
- [ ] **TC-CHR-065** `[PROD-SAFE]` — "Admin Dashboard" appears only for privileged roles
- [ ] **TC-CHR-066** `[PROD-SAFE]` — Reduced motion opens it instantly with no slide
- [ ] **TC-CHR-067** `[PROD-SAFE]` — Rotating the device while open does not break layout
- [ ] **TC-CHR-068** `[PROD-SAFE]` — Navigating away while open restores scroll
  - **Steps:** 1. Open 2. Tap a link 3. Confirm the new page scrolls normally

---

## Footer

`src/components/EvanliteFooter.tsx`

- [ ] **TC-CHR-070** `[PROD-SAFE]` — All four columns start collapsed at every width
  - **Expect:** collapsed on desktop too, not just mobile.
- [ ] **TC-CHR-071** `[PROD-SAFE]` — Multiple columns can be open at once
- [ ] **TC-CHR-072** `[PROD-SAFE]` — The chevron rotates 180° when open
- [ ] **TC-CHR-073** `[PROD-SAFE]` — "Full Collection" → `/collection`
- [ ] **TC-CHR-074** `[PROD-SAFE]` — Shirts / Accessories / Limited Editions
  - **Expect:** each lands on `/collection` **unfiltered**.
  - ⚠ **KNOWN** KI-021 — they use `?filter=`, which the page never reads.
- [ ] **TC-CHR-075** `[PROD-SAFE]` — "Our Story" → `/about`; "My Orders" → `/profile`; "Naami Journal" → `/journal`
- [ ] **TC-CHR-076** `[PROD-SAFE]` — "Contact Support" appears only when `NEXT_PUBLIC_CONTACT_EMAIL` is set
  - **Expect:** if present it is a `mailto:` link that opens a mail client.
- [ ] **TC-CHR-077** `[PROD-SAFE]` — Keyboard cannot toggle the accordion
  - **Steps:** 1. Tab to a column header 2. Press Enter, then Space
  - **Expect:** nothing happens.
  - ⚠ **KNOWN** KI-046 — `role="button" tabIndex={0}` with no key handler. This is
    an accessibility defect; confirm it still reproduces.
- [ ] **TC-CHR-078** `[PROD-DATA]` — The footer doodle renders when enabled
  - **Pre:** `/admin/design` → Footer Doodle, drawn and enabled
  - **Expect:** the doodle sits right of a shrunken "naami" wordmark. Disabled →
    plain wordmark watermark.
- [ ] **TC-CHR-079** `[PROD-SAFE]` — Footer is absent on `/auth`

---

## Custom cursor & scroll ribbon

`src/components/CustomCursor.tsx`, `src/components/SelvedgeScrollbar.tsx`

- [ ] **TC-CHR-085** `[PROD-SAFE]` — Desktop shows the custom cursor, native cursor hidden
- [ ] **TC-CHR-086** `[PROD-SAFE]` — Hovering a labelled element shows its label
  - **Steps:** 1. Hover a product card
  - **Expect:** "VIEW" (or the element's `data-cursor-text`) appears near the pearl.
- [ ] **TC-CHR-087** `[PROD-SAFE]` — Touch devices keep the native behaviour
  - **Expect:** no custom cursor on a phone; nothing invisible or unclickable.
- [ ] **TC-CHR-088** `[PROD-SAFE]` — `/admin` uses the normal system cursor
- [ ] **TC-CHR-089** `[LOCAL-ONLY]` — A cursor script error does not leave the site unusable
  - **Note:** the component sets `cursor: none !important` on every element. If it
    errors after that, the site has **no visible cursor at all**. Worth confirming
    the failure mode.
- [ ] **TC-CHR-090** `[PROD-SAFE]` — The right-edge ribbon tracks scroll progress
  - **Expect:** grows as you scroll down, full at the bottom. Absent on `/admin`.

---

## 404 handling

- [ ] **TC-CHR-095** `[PROD-SAFE]` — An unknown URL shows a 404
  - **Steps:** 1. Visit `/this-does-not-exist`
  - **Expect:** Next's default 404 inside the site layout — header renders, no
    branded page, **no footer**.
  - ⚠ **KNOWN** KI-027 — there is no `not-found.tsx` anywhere.
- [ ] **TC-CHR-096** `[PROD-SAFE]` — A nonexistent product id 404s
  - **Steps:** `/product/99999999`
  - **Expect:** the in-page "Product not found." state with a "Return to Atelier"
    link — this one is handled, unlike the route-level 404.
- [ ] **TC-CHR-097** `[PROD-SAFE]` — A non-numeric product id behaves the same
  - **Steps:** `/product/abc`
