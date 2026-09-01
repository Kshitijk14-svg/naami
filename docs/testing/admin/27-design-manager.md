# 27 — Design Manager

`/admin/design`

Eleven tabs, **each with its own independent Save button**. Switching tabs does not
prompt about unsaved edits, and three tabs save sequentially in a loop that aborts
on the first failure, leaving partial state (KI-036).

> **Changes take up to 5 minutes to appear** on the storefront — the page says so
> itself. Factor that into every verification step.

> ⚠ **This page changes the live homepage.** Everything here is `[PROD-DATA]`.
> Screenshot the current configuration of any tab before editing it, and restore
> afterwards. Announce a test window if anyone else is working on the site.

**Area prefix:** `TC-ADM-DSN`

---

## Shell

- [ ] **TC-ADM-DSN-001** `[PROD-DATA]` — All eleven tabs render
  - **Expect:** Hero Banner, Lookbook Banner, Hotspot Cards, Loom Timeline, Coin
    Pocket Card, Manifesto, Section Headers, Section Backgrounds, Footer Doodle,
    Announcements, Shared Moments.
- [ ] **TC-ADM-DSN-002** `[PROD-DATA]` — "Loading settings…" shows until all four fetches resolve
- [ ] **TC-ADM-DSN-003** `[PROD-DATA]` — The active tab has a red underline
- [ ] **TC-ADM-DSN-004** `[PROD-DATA]` — **Switching tabs keeps unsaved edits in memory**
  - **Steps:** 1. On Hero Banner, change a title but do **not** save 2. Switch to
    Manifesto 3. Switch back
  - **Expect:** your edit is still there, unsaved. No warning was shown.
- [ ] **TC-ADM-DSN-005** `[PROD-DATA]` — **Leaving the page discards unsaved edits silently**
  - **Steps:** 1. Change a field 2. Navigate to `/admin` 3. Come back
  - **Expect:** the change is gone with no prompt. Record as S3.
- [ ] **TC-ADM-DSN-006** `[PROD-DATA]` — Each tab's Save affects only that tab
- [ ] **TC-ADM-DSN-007** `[PROD-DATA]` — Save shows "Saving…" then a green "Saved ✓" for ~3s
- [ ] **TC-ADM-DSN-008** `[LOCAL-ONLY]` — **Load failures are swallowed entirely**
  - **Steps:** 1. Block `/api/admin/design` 2. Reload the page
  - **Expect:** the page renders with empty fields and **no error message**.
  - **Note:** this is also what a staff user sees — a 403 produces an empty,
    error-free page. Record as S3.

---

## Tab 1 — Hero Banner

- [ ] **TC-ADM-DSN-012** `[PROD-DATA]` — Three slide blocks render, each with image, title, subtitle, tag
- [ ] **TC-ADM-DSN-013** `[PROD-DATA]` — The image hint gives the recommended size
  - **Expect:** "1920 × 1440 (4:3) — keep the subject inside the centered
    900 × 850 area; avoid the bottom-left corner (text overlay)."
- [ ] **TC-ADM-DSN-014** `[PROD-DATA]` — Saving updates all three slides on `/`
- [ ] **TC-ADM-DSN-015** `[PROD-DATA]` — Text fields have no length limit
  - **Steps:** 1. Enter a 500-character title 2. Save 3. View the homepage
  - **Expect:** it saves. Record how it renders — likely overflowing. S3.
- [ ] **TC-ADM-DSN-016** `[PROD-DATA]` — An empty slide image falls back gracefully
- [ ] **TC-ADM-DSN-017** `[PROD-DATA]` — There is no way to remove a hero image
  - **Expect:** replacement only.

---

## Tab 2 — Lookbook Banner

- [ ] **TC-ADM-DSN-021** `[PROD-DATA]` — Image, Section Label and a hotspot editor render
- [ ] **TC-ADM-DSN-022** `[PROD-DATA]` — The hotspot pad is square (1:1)
- [ ] **TC-ADM-DSN-023** `[PROD-DATA]` — Saving updates the homepage banner
- [ ] **TC-ADM-DSN-024** `[LOCAL-ONLY]` — **A partial save is possible**
  - **Steps:** 1. Change both the label and a hotspot 2. Block
    `/api/admin/homepage-banner-hotspots` only 3. Save
  - **Expect:** the label **is saved** (first request succeeded) but the hotspots are
    not, and an error appears. ⚠ **KNOWN** KI-036 — two sequential requests with no
    rollback.

---

## Tab 3 — Hotspot Cards

- [ ] **TC-ADM-DSN-028** `[PROD-DATA]` — "+ Add Card" appends a blank card
- [ ] **TC-ADM-DSN-029** `[PROD-DATA]` — Each card has image, title, subtitle, sort order, hotspots
- [ ] **TC-ADM-DSN-030** `[PROD-DATA]` — A blank title is rejected on save
  - **Expect:** "title is required"
- [ ] **TC-ADM-DSN-031** `[PROD-DATA]` — The hotspot pad is 4:5 here
- [ ] **TC-ADM-DSN-032** `[PROD-DATA]` — "Remove Card" has **no confirmation**
  - **Expect:** it disappears from the form immediately. The deletion is only
    applied on Save.
- [ ] **TC-ADM-DSN-033** `[PROD-DATA]` — Removing then leaving without saving keeps the card
  - **Steps:** 1. Remove a card 2. Navigate away without saving 3. Return
  - **Expect:** the card is still there.
- [ ] **TC-ADM-DSN-034** `[PROD-DATA]` — Sort order controls card sequence on the homepage
- [ ] **TC-ADM-DSN-035** `[PROD-DATA]` — A blank sort order becomes 0
- [ ] **TC-ADM-DSN-036** `[LOCAL-ONLY]` — **A mid-loop failure leaves a partial save**
  - **Steps:** 1. Have three cards 2. Edit all three 3. Make the second fail (block
    the request or give it an invalid field) 4. Save
  - **Expect:** card 1 is saved, cards 2 and 3 are not, and any staged deletions
    have **already been applied**. ⚠ **KNOWN** KI-036. Record the resulting state
    precisely — this is the most damaging variant.
- [ ] **TC-ADM-DSN-037** `[PROD-DATA]` — There is no publish toggle on this tab
  - **Expect:** confirm — new cards are always published.

---

## Tab 4 — Loom Timeline

- [ ] **TC-ADM-DSN-041** `[PROD-DATA]` — Panels 1 and 2 have image, kicker, title, label, body
- [ ] **TC-ADM-DSN-042** `[PROD-DATA]` — **Panel 3 has no image field**
  - **Expect:** it is labelled "Panel 3 (Finale — no image, uses the logo
    medallion)" and offers only Kicker, Title and Body.
- [ ] **TC-ADM-DSN-043** `[PROD-DATA]` — Saving updates all three panels on `/`
- [ ] **TC-ADM-DSN-044** `[PROD-DATA]` — Body fields are textareas
- [ ] **TC-ADM-DSN-045** `[PROD-DATA]` — A long body does not break the pinned scroll
  - **Steps:** 1. Enter a very long panel body 2. Save 3. Scroll the section on
    desktop

---

## Tab 5 — Coin Pocket Card

- [ ] **TC-ADM-DSN-049** `[PROD-DATA]` — Kicker, season tag, title, accent and description render
- [ ] **TC-ADM-DSN-050** `[PROD-DATA]` — **Exactly five spec rows, fixed**
  - **Expect:** five label/value pairs. There is no add or remove — confirm.
- [ ] **TC-ADM-DSN-051** `[PROD-DATA]` — A serial code field is present
- [ ] **TC-ADM-DSN-052** `[PROD-DATA]` — Saving updates the homepage section
- [ ] **TC-ADM-DSN-053** `[PROD-DATA]` — An empty spec row renders acceptably
  - **Steps:** 1. Clear spec 3's label and value 2. Save 3. Check the homepage
  - **Expect:** record whether a blank row is skipped or leaves a gap.

---

## Tab 6 — Manifesto

- [ ] **TC-ADM-DSN-057** `[PROD-DATA]` — Image, kicker, quote and attribution render
- [ ] **TC-ADM-DSN-058** `[PROD-DATA]` — The image hint reads "1440 × 1920 (3:4 portrait)."
- [ ] **TC-ADM-DSN-059** `[PROD-DATA]` — Saving updates the homepage

---

## Tab 7 — Section Headers

- [ ] **TC-ADM-DSN-063** `[PROD-DATA]` — Four sub-blocks render
  - **Expect:** Collections Showcase, New Arrivals, Bestsellers, Shop The Look.
- [ ] **TC-ADM-DSN-064** `[PROD-DATA]` — The Side Note textarea splits on newlines
  - **Steps:** 1. Enter three lines 2. Save 3. Check the homepage
  - **Expect:** three separate rows render.
- [ ] **TC-ADM-DSN-065** `[PROD-DATA]` — A blank Gateway Label hides that button
  - **Steps:** 1. Clear New Arrivals' Gateway Label 2. Save 3. Check `/`
  - **Expect:** the gateway button below that carousel disappears.
- [ ] **TC-ADM-DSN-066** `[PROD-DATA]` — All twelve keys save together

---

## Tab 8 — Section Backgrounds

- [ ] **TC-ADM-DSN-070** `[PROD-DATA]` — Ten sections each have an image and a fit dropdown
- [ ] **TC-ADM-DSN-071** `[PROD-DATA]` — **This is the only tab with "Remove image"**
  - **Expect:** the clear control appears here and nowhere else.
- [ ] **TC-ADM-DSN-072** `[PROD-DATA]` — Removing sets the key to empty and clears the background
- [ ] **TC-ADM-DSN-073** `[PROD-DATA]` — Fit "Cover" fills and may crop
- [ ] **TC-ADM-DSN-074** `[PROD-DATA]` — Fit "Contain" places once without repeating
- [ ] **TC-ADM-DSN-075** `[PROD-DATA]` — Fit "Tile" repeats at intrinsic size
  - **Steps:** 1. Upload a small square 2. Set Tile 3. Check the homepage
  - **Expect:** a repeating pattern, not one stretched image.
- [ ] **TC-ADM-DSN-076** `[PROD-DATA]` — Each background lands on the right section
  - **Steps:** set a distinct, obvious image on each of the ten and verify placement
- [ ] **TC-ADM-DSN-077** `[PROD-DATA]` — Backgrounds do not obscure text
  - **Expect:** check contrast on every section after setting a busy image.

---

## Tab 9 — Footer Doodle

- [ ] **TC-ADM-DSN-081** `[PROD-DATA]` — The canvas accepts mouse drawing
- [ ] **TC-ADM-DSN-082** `[PROD-DATA]` — It accepts touch and pen input
  - **Steps:** draw on a tablet or phone
- [ ] **TC-ADM-DSN-083** `[PROD-DATA]` — Eight colour swatches select the brush colour
- [ ] **TC-ADM-DSN-084** `[PROD-DATA]` — **The default colour is not in the palette**
  - **Steps:** 1. Open the tab fresh 2. Look at which swatch is selected
  - **Expect:** none appears selected, because the initial colour is not one of the
    eight. Record as S4.
- [ ] **TC-ADM-DSN-085** `[PROD-DATA]` — Three brush widths (3 / 6 / 10) work, default 6
- [ ] **TC-ADM-DSN-086** `[PROD-DATA]` — Undo removes the last stroke only
- [ ] **TC-ADM-DSN-087** `[PROD-DATA]` — Undo is disabled with no strokes
- [ ] **TC-ADM-DSN-088** `[PROD-DATA]` — Clear wipes everything with **no confirmation**
- [ ] **TC-ADM-DSN-089** `[PROD-DATA]` — Clear is disabled when already empty
- [ ] **TC-ADM-DSN-090** `[PROD-DATA]` — Drawing past the complexity limit is rejected
  - **Steps:** 1. Scribble continuously to exceed 8,000 points or 400 strokes
  - **Expect:** **"Doodle too complex — the last stroke was dropped. Try Undo or
    Clear to simplify."** and that stroke is discarded — earlier work survives.
- [ ] **TC-ADM-DSN-091** `[PROD-DATA]` — The enable checkbox shows/hides it in the footer
- [ ] **TC-ADM-DSN-092** `[PROD-DATA]` — Saving persists the drawing across a reload
- [ ] **TC-ADM-DSN-093** `[PROD-DATA]` — The doodle renders in the site footer
  - **Steps:** 1. Enable and save 2. Load any storefront page 3. Scroll to the footer
  - **Expect:** it appears bottom-right, and the "naami" wordmark shrinks left.

---

## Tab 10 — Announcements

- [ ] **TC-ADM-DSN-097** `[PROD-DATA]` — Two slots, each with enable, text and link
- [ ] **TC-ADM-DSN-098** `[PROD-DATA]` — An enabled slot with text shows on the storefront
- [ ] **TC-ADM-DSN-099** `[PROD-DATA]` — An enabled slot with **blank text** does not show
- [ ] **TC-ADM-DSN-100** `[PROD-DATA]` — Both enabled cross-fades every 4.5 seconds
- [ ] **TC-ADM-DSN-101** `[PROD-DATA]` — A link makes the text clickable
- [ ] **TC-ADM-DSN-102** `[LOCAL-ONLY]` — **The link is not validated**
  - **Steps:** 1. Set a link to `javascript:alert(1)` 2. Save 3. Click the
    announcement on the storefront
  - **Expect:** record exactly what happens. This is a site-wide element on every
    page — if it executes, report **S1**.
  - **Cleanup:** clear the link immediately.
- [ ] **TC-ADM-DSN-103** `[LOCAL-ONLY]` — The text is not HTML-injectable
  - **Steps:** 1. Set the text to `<img src=x onerror=alert(1)>` 2. Save 3. Load `/`
  - **Expect:** it renders as visible text with no alert. **If an alert fires,
    report S1** — this appears on every page.
  - **Cleanup:** restore the text.

---

## Tab 11 — Shared Moments

**Two independent save buttons** — verify they are genuinely independent.

- [ ] **TC-ADM-DSN-107** `[PROD-DATA]` — Enable checkbox, kicker and title have their own Save
- [ ] **TC-ADM-DSN-108** `[PROD-DATA]` — "Save Section Header" does not save videos
  - **Steps:** 1. Change the kicker **and** add a video 2. Click "Save Section
    Header" only 3. Reload
  - **Expect:** the kicker is saved, the video is not.
- [ ] **TC-ADM-DSN-109** `[PROD-DATA]` — "Save Videos" does not save the header
- [ ] **TC-ADM-DSN-110** `[PROD-DATA]` — "+ Add Video" appends a blank row
- [ ] **TC-ADM-DSN-111** `[PROD-DATA]` — Each video row has upload, caption and sort order
- [ ] **TC-ADM-DSN-112** `[PROD-DATA]` — **A row with no uploaded video is silently dropped**
  - **Steps:** 1. Click "+ Add Video" 2. Type a caption but **do not upload**
    3. Click "Save Videos" 4. Reload
  - **Expect:** the row has vanished with **no warning**. ⚠ **KNOWN** KI-036.
- [ ] **TC-ADM-DSN-113** `[PROD-DATA]` — "Remove Video" has no confirmation
- [ ] **TC-ADM-DSN-114** `[PROD-DATA]` — Sort order controls carousel sequence
- [ ] **TC-ADM-DSN-115** `[LOCAL-ONLY]` — A mid-loop failure leaves a partial save ⚠ **KNOWN** KI-036
- [ ] **TC-ADM-DSN-116** `[PROD-DATA]` — There is no "Remove video" clear control on the upload field
  - **Expect:** confirm absence — you can only replace, or remove the whole row.

---

## Hotspot editor (tabs 2 and 3)

- [ ] **TC-ADM-DSN-120** `[PROD-DATA]` — "+ Add Hotspot" adds one at 50/50 and selects it
- [ ] **TC-ADM-DSN-121** `[PROD-DATA]` — Clicking the image places the selected hotspot
- [ ] **TC-ADM-DSN-122** `[PROD-DATA]` — Dragging a marker repositions it live
- [ ] **TC-ADM-DSN-123** `[PROD-DATA]` — Dragging works with touch
- [ ] **TC-ADM-DSN-124** `[PROD-DATA]` — Clicking a marker selects without moving it
- [ ] **TC-ADM-DSN-125** `[PROD-DATA]` — The selected marker is larger with a white ring
- [ ] **TC-ADM-DSN-126** `[PROD-DATA]` — Top/Left percentages clamp to 0–100
  - **Steps:** 1. Type `150` into Top 2. Then `-20`
  - **Expect:** `100` and `0` respectively.
- [ ] **TC-ADM-DSN-127** `[PROD-DATA]` — Decimals round to integers
- [ ] **TC-ADM-DSN-128** `[PROD-DATA]` — The product picker lists products with prices
- [ ] **TC-ADM-DSN-129** `[PROD-DATA]` — **The picker has no search**
  - **Expect:** a plain unfiltered dropdown. With a large catalogue this is
    unusable — record as S3.
- [ ] **TC-ADM-DSN-130** `[PROD-DATA]` — A hotspot with no product is allowed
  - **Expect:** saves, and renders "Item unavailable" on the storefront.
- [ ] **TC-ADM-DSN-131** `[PROD-DATA]` — The ✕ removes a hotspot with no confirmation
- [ ] **TC-ADM-DSN-132** `[PROD-DATA]` — Removing re-indexes the selection correctly
- [ ] **TC-ADM-DSN-133** `[PROD-DATA]` — Hotspot positions match the live storefront
  - **Steps:** 1. Place a hotspot at a distinctive point 2. Save 3. Compare with `/`
  - **Expect:** the same relative position. The editor forces the configured aspect
    ratio so the preview matches the live crop.
- [ ] **TC-ADM-DSN-134** `[LOCAL-ONLY]` — A picker fetch failure gives an empty dropdown
  - **Expect:** no error, just no options. Record as S3.
