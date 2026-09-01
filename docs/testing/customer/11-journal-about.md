# 11 — Journal & About

`/journal`, `/journal/[slug]`, `/about`

Both journal routes are server-rendered with ISR at **`revalidate = 300`** — a
change can take up to five minutes to appear. Factor that into every case here.

**Area prefix:** `TC-JRN`

---

## Journal index

- [ ] **TC-JRN-001** `[PROD-SAFE]` — Published posts render as cards
- [ ] **TC-JRN-002** `[PROD-SAFE]` — Draft posts do **not** appear
  - **Pre:** a post with "Publish immediately" unchecked
- [ ] **TC-JRN-003** `[PROD-DATA]` — A newly published post appears within 5 minutes
  - **Steps:** 1. Publish a post 2. Reload `/journal` immediately 3. Reload again
    after 5 minutes
  - **Expect:** likely absent at first, present after the revalidate window. This is
    ISR, not a bug — but confirm the delay is no longer than that.
- [ ] **TC-JRN-004** `[PROD-SAFE]` — Grid is 1 / 2 / 3 columns at mobile / `md` / `lg`
- [ ] **TC-JRN-005** `[PROD-SAFE]` — Each card shows cover, date, title, excerpt and "Read →"
- [ ] **TC-JRN-006** `[PROD-DATA]` — A post with **no cover** shows a wordmark tile
  - **Expect:** a cream tile with a faint "NAAMI", not a broken image.
- [ ] **TC-JRN-007** `[PROD-DATA]` — A post with no `publishedAt` omits the date line
- [ ] **TC-JRN-008** `[PROD-DATA]` — A long excerpt truncates at 120 characters
  - **Pre:** an excerpt over 120 characters
  - **Expect:** cut at 120 with an ellipsis.
- [ ] **TC-JRN-009** `[PROD-DATA]` — A post with no excerpt omits that line
- [ ] **TC-JRN-010** `[PROD-SAFE]` — The whole card is one link to `/journal/{slug}`
- [ ] **TC-JRN-011** `[PROD-SAFE]` — Hovering scales the cover slightly
- [ ] **TC-JRN-012** `[PROD-DATA]` — Zero published posts shows "New stories coming soon."
- [ ] **TC-JRN-013** `[PROD-SAFE]` — There is no search, tag filter, pagination or sort
  - **Expect:** confirm absence — every published post renders at once, newest
    first. Record as S3 if the archive grows.

---

## Journal post

- [ ] **TC-JRN-017** `[PROD-SAFE]` — A published post renders in full
- [ ] **TC-JRN-018** `[PROD-DATA]` — An **unpublished** slug 404s
  - **Expect:** Next's default 404 inside the site layout — header renders, no
    branded page, **no footer**. ⚠ **KNOWN** KI-027.
- [ ] **TC-JRN-019** `[PROD-SAFE]` — An unknown slug 404s identically
- [ ] **TC-JRN-020** `[PROD-DATA]` — The cover image is absent when not set
- [ ] **TC-JRN-021** `[PROD-SAFE]` — "← Journal" and "← All Stories" both return to the index

### Body rendering — the important cases

- [ ] **TC-JRN-025** `[PROD-DATA]` — Newlines become line breaks
  - **Pre:** a post whose body has three paragraphs separated by blank lines
  - **Expect:** the line breaks are preserved visually.

- [ ] **TC-JRN-026** `[PROD-DATA]` — **HTML in a post body renders as visible text**
  - **Pre:** a post whose body contains:
    ```html
    <strong>bold</strong> and <a href="/collection">a link</a>
    <h2>A heading</h2>
    ```
  - **Steps:** 1. Publish it 2. Wait for revalidation 3. View the post
  - **Expect:** the tags appear **as literal text** — no bold, no working link, no
    heading.
  - ⚠ **KNOWN** KI-002. The admin editor is labelled "HTML or plain text", so this
    is a broken feature. Confirm and capture a screenshot.

- [ ] **TC-JRN-027** `[PROD-DATA]` — **A script payload does not execute**
  - **Pre:** a post whose body contains:
    ```html
    <script>alert('xss')</script>
    <img src=x onerror=alert('xss2')>
    ```
  - **Steps:** 1. Publish 2. Open the post with the Console open
  - **Expect:** **no alert fires.** The payload renders as visible escaped text.
    Check the Console for errors and View Source to confirm `&lt;script&gt;`.
  - **If an alert fires, stop and report S1 immediately.**
  - **Cleanup:** delete the test post.

- [ ] **TC-JRN-028** `[PROD-DATA]` — Quotes and ampersands render correctly
  - **Pre:** body containing `Ben & Jerry's "famous" ice cream`
  - **Expect:** displays exactly that, with no stray `&amp;` or `&quot;` visible.
    A double-escaping bug would show `&amp;` on screen.

- [ ] **TC-JRN-029** `[PROD-SAFE]` — Body typography is legible
  - **Note:** the wrapper uses a `prose-naami` class that is **not defined** in the
    stylesheet, so all styling comes from inline font-size and line-height. Record
    any typographic problems as S4.

### Metadata

- [ ] **TC-JRN-033** `[PROD-DATA]` — The tab title is `{post title} — NAAMI Journal`
- [ ] **TC-JRN-034** `[PROD-DATA]` — An unpublished slug gets the generic title
  - **Expect:** "Journal — NAAMI Atelier" — no leak of the draft title.
- [ ] **TC-JRN-035** `[PROD-DATA]` — Open Graph tags are present
  - **Steps:** 1. View source 2. Find `og:title`, `og:description`, `og:image`,
    `article:published_time`
- [ ] **TC-JRN-036** `[PROD-DATA]` — Sharing a post link shows a preview card
  - **Steps:** 1. Paste the URL into WhatsApp or Slack
  - **Expect:** title, description and cover image appear.

---

## About

`/about` · content is entirely hardcoded in the file — nothing is admin-editable.

- [ ] **TC-ABT-001** `[PROD-SAFE]` — All six sections render
  - **Expect:** hero, brand story, "Three Absolutes" pillars, archive timeline,
    team, closing manifesto.
- [ ] **TC-ABT-002** `[PROD-SAFE]` — Sections fade in as you scroll
- [ ] **TC-ABT-003** `[LOCAL-ONLY]` — **A scroll-animation failure blanks the page**
  - **Steps:** 1. Block the GSAP bundle 2. Load `/about`
  - **Expect:** confirm and record. Every section starts at inline `opacity: 0`, so
    a script failure leaves an essentially blank page rather than an unanimated one.
- [ ] **TC-ABT-004** `[PROD-SAFE]` — A short viewport still reveals every section
  - **Steps:** 1. Set the window to ~500px tall 2. Scroll to the bottom
- [ ] **TC-ABT-005** `[PROD-SAFE]` — Reduced motion still shows all content
- [ ] **TC-ABT-006** `[PROD-SAFE]` — "Shop the Collection" navigates to `/collection`
- [ ] **TC-ABT-007** `[PROD-SAFE]` — That button and the footer are the only interactive elements
- [ ] **TC-ABT-008** `[PROD-SAFE]` — Team members render as initials tiles, not photos
- [ ] **TC-ABT-009** `[PROD-SAFE]` — **The content is factually wrong for this brand**
  - **Steps:** 1. Read the brand story and timeline
  - **Expect:** you will find "Founded 2019 · Lisbon, Portugal", Portuguese and
    Japanese sourcing claims, and fictional team names.
  - ⚠ **KNOWN** KI-044. This is public-facing copy that contradicts the rest of the
    site — worth fixing before launch even though it is only S4 technically.
- [ ] **TC-ABT-010** `[PROD-SAFE]` — The route skeleton covers only the hero and story split
