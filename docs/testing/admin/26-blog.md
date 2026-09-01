# 26 — Blog

`/admin/blog`

Hand-rolled table and modal — it does **not** use the shared `CrudTable` /
`CrudModal`, so its behaviour differs from every other section. Contains KI-014
(duplicate slug → bare 500) and is the authoring end of KI-002 (HTML no longer
renders).

**Area prefix:** `TC-ADM-BLG`

---

## List

- [ ] **TC-ADM-BLG-001** `[PROD-SAFE]` — Four columns render
  - **Expect:** Title, Status, Published, Actions.
- [ ] **TC-ADM-BLG-002** `[PROD-SAFE]` — The title cell shows `/journal/{slug}` beneath
- [ ] **TC-ADM-BLG-003** `[PROD-SAFE]` — Status is a green "Published" or grey "Draft" pill
- [ ] **TC-ADM-BLG-004** `[PROD-DATA]` — A draft shows `—` in the Published column
- [ ] **TC-ADM-BLG-005** `[PROD-SAFE]` — Posts are newest first
- [ ] **TC-ADM-BLG-006** `[PROD-SAFE]` — No sort, pagination or search
- [ ] **TC-ADM-BLG-007** `[PROD-DATA]` — Zero posts shows "No blog posts yet. Create your first story."
- [ ] **TC-ADM-BLG-008** `[PROD-SAFE]` — Soft-deleted posts do not appear

---

## Modal behaviour

Different from every other modal in the admin — verify each difference.

- [ ] **TC-ADM-BLG-012** `[PROD-SAFE]` — "+ New Post" opens the modal
- [ ] **TC-ADM-BLG-013** `[PROD-SAFE]` — Backdrop click closes it
- [ ] **TC-ADM-BLG-014** `[PROD-SAFE]` — Clicking inside does not close it
- [ ] **TC-ADM-BLG-015** `[PROD-SAFE]` — **There is no × close button**
  - **Expect:** confirm absence — only Cancel and the backdrop close it. Every other
    admin modal has an ×. Record as S4.
- [ ] **TC-ADM-BLG-016** `[PROD-SAFE]` — **Escape does not close it**
  - **Expect:** confirm — `CrudModal` handles Escape, this one does not. S4.
- [ ] **TC-ADM-BLG-017** `[PROD-SAFE]` — Cancel closes and discards with no warning

---

## Fields

- [ ] **TC-ADM-BLG-021** `[PROD-DATA]` — A valid post saves
  - **Steps:** Title `ZZ TEST Post`, Content `Hello world`, Save
- [ ] **TC-ADM-BLG-022** `[PROD-DATA]` — An empty title is rejected client-side
  - **Expect:** "Title and content are required." shown **without** a network
    request — check the Network tab.
- [ ] **TC-ADM-BLG-023** `[PROD-DATA]` — An empty content is rejected the same way
- [ ] **TC-ADM-BLG-024** `[PROD-DATA]` — A whitespace-only title is rejected
- [ ] **TC-ADM-BLG-025** `[PROD-DATA]` — **On create, the title auto-fills the slug**
  - **Steps:** 1. New Post 2. Type `My First Story` in Title
  - **Expect:** Slug becomes `my-first-story`.
- [ ] **TC-ADM-BLG-026** `[PROD-DATA]` — **On edit, the title does NOT regenerate the slug**
  - **Steps:** 1. Edit an existing post 2. Change the Title
  - **Expect:** the Slug is untouched — deliberate, so published URLs do not break.
    Confirm the difference from create.
- [ ] **TC-ADM-BLG-027** `[PROD-DATA]` — A blank slug is derived from the title server-side
  - **Steps:** 1. Type a Title 2. **Clear** the Slug 3. Save 4. Reopen
  - **Expect:** a slug was generated.
- [ ] **TC-ADM-BLG-028** `[PROD-DATA]` — **A duplicate slug gives a bare failure**
  - **Steps:** 1. Create a post with slug `zz-test-dupe` 2. Create another with the
    same slug
  - **Expect:** it should say the slug is taken. ⚠ **KNOWN** KI-014 — expect
    **"Failed to save."** with a 500 in the Network tab.
  - **Compare with categories**, which returns a proper 409. Capture both.
- [ ] **TC-ADM-BLG-029** `[PROD-DATA]` — The slug accepts arbitrary characters
  - **Steps:** 1. Enter `Hello World!!` as the slug manually 2. Save
  - **Expect:** it is stored as typed — the slug field is not validated or
    normalised on input. Then check `/journal/{that slug}` resolves. Record as S3.
- [ ] **TC-ADM-BLG-030** `[PROD-DATA]` — Excerpt is optional
- [ ] **TC-ADM-BLG-031** `[PROD-DATA]` — An excerpt over 120 characters truncates on the index
  - **See** `customer/11-journal-about.md` TC-JRN-008.
- [ ] **TC-ADM-BLG-032** `[PROD-DATA]` — A cover image uploads and previews
- [ ] **TC-ADM-BLG-033** `[PROD-DATA]` — The generated thumbnail is discarded
  - **Steps:** 1. Upload a cover 2. Check the stored record
  - **Expect:** only `coverImage` is set; the thumbnail the upload produced is not
    used. Minor waste — record as S4.
- [ ] **TC-ADM-BLG-034** `[PROD-DATA]` — There is no way to remove a cover once set
  - **Expect:** no clear control — only replacement. S3.

---

## Content field — the important cases

The field is labelled **"Content * (HTML or plain text)"**.

- [ ] **TC-ADM-BLG-038** `[PROD-DATA]` — Plain text with paragraphs renders correctly
  - **Steps:** 1. Enter three paragraphs separated by blank lines 2. Publish 3. Wait
    for revalidation 4. View the post
  - **Expect:** line breaks preserved.

- [ ] **TC-ADM-BLG-039** `[PROD-DATA]` — **HTML is accepted here but renders as text**
  - **Steps:** 1. Enter `<strong>bold</strong> and <a href="/collection">link</a>`
    2. Publish 3. View the post
  - **Expect:** the tags appear as **literal visible text** — not bold, not a link.
  - ⚠ **KNOWN** KI-002. The field label promises HTML support that no longer exists.
    Capture a screenshot of the admin label next to the rendered output.

- [ ] **TC-ADM-BLG-040** `[PROD-DATA]` — A script payload does not execute
  - **See** `customer/11-journal-about.md` TC-JRN-027 for the full case. Any alert
    firing is **S1**.

- [ ] **TC-ADM-BLG-041** `[PROD-DATA]` — Very long content saves
  - **Steps:** 1. Paste ~50,000 characters 2. Save
  - **Expect:** accepted — the column is `text` with no cap. Note the page render
    time.

---

## Publishing

- [ ] **TC-ADM-BLG-045** `[PROD-DATA]` — "Publish immediately" defaults to **unchecked**
- [ ] **TC-ADM-BLG-046** `[PROD-DATA]` — A draft does not appear at `/journal`
- [ ] **TC-ADM-BLG-047** `[PROD-DATA]` — A draft's slug 404s on the public site
- [ ] **TC-ADM-BLG-048** `[PROD-DATA]` — Publishing sets `publishedAt`
- [ ] **TC-ADM-BLG-049** `[PROD-DATA]` — **Unpublishing does not clear `publishedAt`**
  - **Steps:** 1. Publish a post 2. Note the Published date 3. Edit and uncheck
    Publish 4. Save 5. Look at the list
  - **Expect:** Status reads "Draft" but the **Published column still shows a
    date**. Record as S3 — the row contradicts itself.
- [ ] **TC-ADM-BLG-050** `[PROD-DATA]` — Republishing keeps the original date
  - **Expect:** `publishedAt` is set only the first time, so the original date
    survives. Confirm and decide whether that is desirable.
- [ ] **TC-ADM-BLG-051** `[PROD-DATA]` — A published post appears within 5 minutes
  - **Note:** ISR `revalidate = 300`.

---

## Delete

- [ ] **TC-ADM-BLG-055** `[PROD-DATA]` — Delete shows its own confirmation wording
  - **Expect:** **"Delete this post permanently?"** — different from the shared
    "Delete this item? This cannot be undone."
- [ ] **TC-ADM-BLG-056** `[PROD-DATA]` — **The wording is misleading**
  - **Steps:** 1. Delete a post 2. Check the database
    ```sql
    SELECT id, title, deleted_at FROM blog_posts WHERE title LIKE 'ZZ TEST%';
    ```
  - **Expect:** the row still exists with `deleted_at` set. It says "permanently"
    but performs a soft delete. Record as S4.
- [ ] **TC-ADM-BLG-057** `[PROD-DATA]` — A deleted post 404s on the public site
- [ ] **TC-ADM-BLG-058** `[LOCAL-ONLY]` — **Deleting a nonexistent post still returns success**
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' -X DELETE "$BASE/api/admin/blog/99999999" \
    -H "cookie: naami_session=$SESSION_ADMIN"
  ```
  **Expect:** **204** — the delete result is discarded, unlike every other DELETE
  which 404s. Record as S4.
- [ ] **TC-ADM-BLG-059** `[LOCAL-ONLY]` — A failed delete silently leaves the row
  - **Expect:** the list reloads unchanged with no error — the status is not checked.
