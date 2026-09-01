# 23 — Categories & Collections

`/admin/categories` and `/admin/collections`

Two similar CRUD sections that behave **differently** on duplicate-key errors —
categories handles it, collections does not (KI-014). That contrast is the main
thing to verify here.

**Area prefix:** `TC-ADM-CAT` / `TC-ADM-COL`

---

## Categories — list

- [ ] **TC-ADM-CAT-001** `[PROD-SAFE]` — Columns: Name, Slug, Description, Created, Actions
- [ ] **TC-ADM-CAT-002** `[PROD-SAFE]` — A null description shows `—`
- [ ] **TC-ADM-CAT-003** `[PROD-SAFE]` — Created uses `en-IN` date formatting
  - **Note:** no timezone conversion here, unlike orders and coupons.
- [ ] **TC-ADM-CAT-004** `[PROD-SAFE]` — No sort, pagination or search
- [ ] **TC-ADM-CAT-005** `[LOCAL-ONLY]` — A failed load shows "Failed to load"

## Categories — create & edit

- [ ] **TC-ADM-CAT-009** `[PROD-DATA]` — Typing a Name auto-fills the Slug
  - **Steps:** 1. Type `Limited Edition` in Name
  - **Expect:** Slug becomes `limited-edition` as you type.
- [ ] **TC-ADM-CAT-010** `[PROD-DATA]` — The slug strips invalid characters
  - **Steps:** 1. Type `Men's Shirts & Tops!`
  - **Expect:** something like `mens-shirts--tops` — lowercase, spaces to hyphens,
    everything outside `[a-z0-9-]` removed.
- [ ] **TC-ADM-CAT-011** `[PROD-DATA]` — The slug can be edited by hand
- [ ] **TC-ADM-CAT-012** `[PROD-DATA]` — **Editing the Name overwrites a manual slug**
  - **Steps:** 1. Set Name `Shirts` 2. Change the Slug by hand to `tops`
    3. Type one more character in Name
  - **Expect:** your manual slug is replaced. Record as S3 — it silently discards
    deliberate input.
- [ ] **TC-ADM-CAT-013** `[PROD-DATA]` — An empty name is rejected
  - **Expect:** "name and slug are required"
- [ ] **TC-ADM-CAT-014** `[PROD-DATA]` — A whitespace-only name is **accepted**
  - **Steps:** 1. Enter three spaces as the Name 2. Save
  - **Expect:** it saves — the check is truthiness, not trimmed length. Record as S3.
  - **Cleanup:** delete it.
- [ ] **TC-ADM-CAT-015** `[PROD-DATA]` — **A duplicate slug returns a clean 409**
  - **Steps:** 1. Create `ZZ Test A` with slug `zz-test-dupe` 2. Create `ZZ Test B`
    with the same slug
  - **Expect:** **"Slug already exists"** in the red banner — not a generic failure.
    This is the correct behaviour; compare with TC-ADM-COL-012.
- [ ] **TC-ADM-CAT-016** `[PROD-DATA]` — Editing to a duplicate slug also 409s
- [ ] **TC-ADM-CAT-017** `[PROD-DATA]` — Description is a single-line input, not a textarea
  - **Expect:** confirm — long descriptions are awkward to enter. Record as S4.
- [ ] **TC-ADM-CAT-018** `[PROD-DATA]` — Cancel discards with no warning
- [ ] **TC-ADM-CAT-019** `[PROD-DATA]` — A saved category appears in the product form dropdown

## Categories — delete

- [ ] **TC-ADM-CAT-023** `[PROD-DATA]` — Delete confirms, then removes the row
- [ ] **TC-ADM-CAT-024** `[PROD-DATA]` — Deletion is a soft delete
  ```sql
  SELECT id, name, deleted_at FROM categories WHERE name LIKE 'ZZ Test%';
  ```
- [ ] **TC-ADM-CAT-025** `[PROD-DATA]` — **Products keep pointing at a deleted category**
  - **Steps:** 1. Assign a product to `ZZ Test A` 2. Delete that category
    3. Open `/admin/products`
  - **Expect:** the product's Category column shows `—`, but the product still
    carries the id. Reopen the product and confirm the dropdown shows "— None —".
    Record as S3 — orphaned references with no cleanup or warning.
- [ ] **TC-ADM-CAT-026** `[LOCAL-ONLY]` — A failed delete silently leaves the row
  - **Steps:** 1. Block the API 2. Delete
  - **Expect:** the list reloads and the row is still there, with **no error
    message** — the response status is never checked. Record as S3.

---

## Collections — list

- [ ] **TC-ADM-COL-001** `[PROD-SAFE]` — Columns: #, Name, Tag, Products, Published, Homepage, Actions
- [ ] **TC-ADM-COL-002** `[PROD-SAFE]` — Products shows the count of assigned ids
- [ ] **TC-ADM-COL-003** `[PROD-SAFE]` — Homepage shows a red ★ when enabled
- [ ] **TC-ADM-COL-004** `[PROD-SAFE]` — No sort, pagination or search

## Collections — create & edit

- [ ] **TC-ADM-COL-008** `[PROD-DATA]` — A valid collection saves
  - **Steps:** Number `Z1`, Name `ZZ Test Collection`, Save
- [ ] **TC-ADM-COL-009** `[PROD-DATA]` — An empty Number is rejected
  - **Expect:** "name and number are required"
- [ ] **TC-ADM-COL-010** `[PROD-DATA]` — An empty Name is rejected identically
- [ ] **TC-ADM-COL-011** `[PROD-DATA]` — Description is a proper textarea
  - **Expect:** multi-line and vertically resizable — unlike the category form.
- [ ] **TC-ADM-COL-012** `[PROD-DATA]` — **A duplicate Number gives a bare failure**
  - **Steps:** 1. Create a collection with Number `Z1` 2. Create another with the
    same Number
  - **Expect:** it should say the number is taken. ⚠ **KNOWN** KI-014 — expect a
    generic **"Save failed"** with a 500 in the Network tab and no explanation.
  - **Compare with TC-ADM-CAT-015**, which handles the identical situation properly.
    Capture both for the bug report.

### Product IDs field

- [ ] **TC-ADM-COL-016** `[PROD-DATA]` — Comma-separated ids assign products
  - **Steps:** 1. Enter `1,2,3` 2. Save 3. Reopen and check the Products count
- [ ] **TC-ADM-COL-017** `[PROD-DATA]` — Spaces around ids are tolerated
  - **Steps:** `1, 2, 3`
- [ ] **TC-ADM-COL-018** `[PROD-DATA]` — Non-numeric entries are silently dropped
  - **Steps:** 1. Enter `1,abc,3` 2. Save 3. Reopen
  - **Expect:** only 1 and 3 remain, with no warning.
- [ ] **TC-ADM-COL-019** `[PROD-DATA]` — A `0` id is silently dropped
- [ ] **TC-ADM-COL-020** `[PROD-DATA]` — **A nonexistent product id breaks the save**
  - **Steps:** 1. Enter `1,99999999` 2. Save
  - **Expect:** a foreign-key violation surfacing as a bare failure. Record the
    exact message — there is no id validation in the UI. S3.
- [ ] **TC-ADM-COL-021** `[PROD-DATA]` — There is no product picker
  - **Expect:** confirm the field is free text with no autocomplete. You must know
    ids by heart. Record as S3.
- [ ] **TC-ADM-COL-022** `[PROD-DATA]` — Editing replaces the whole assignment
  - **Steps:** 1. Set `1,2,3` and save 2. Change to `4,5` and save 3. Reopen
  - **Expect:** exactly `4,5` — not a merge.

### Image and flags

- [ ] **TC-ADM-COL-026** `[PROD-DATA]` — An uploaded image shows the correct hint
  - **Expect:** "1536 × 1920 (4:5 portrait). Collections in homepage position 3+
    render as 16:10 landscape…"
- [ ] **TC-ADM-COL-027** `[PROD-DATA]` — **There is no way to remove a collection image**
  - **Expect:** no "Remove image" control — you can only replace it. Record as S3.
- [ ] **TC-ADM-COL-028** `[PROD-DATA]` — A blank image gets a server-side default
- [ ] **TC-ADM-COL-029** `[PROD-DATA]` — Published defaults to checked
- [ ] **TC-ADM-COL-030** `[PROD-DATA]` — Unpublishing hides it from `/collection` tabs
- [ ] **TC-ADM-COL-031** `[PROD-DATA]` — "Show on Homepage" adds it to the showcase
- [ ] **TC-ADM-COL-032** `[PROD-DATA]` — Homepage Sort Order controls showcase position
  - **Steps:** 1. Give two homepage collections orders 2 and 1 2. Reload `/`
  - **Expect:** they render in ascending order.

## Collections — delete

- [ ] **TC-ADM-COL-036** `[PROD-DATA]` — Delete confirms and removes the row
- [ ] **TC-ADM-COL-037** `[PROD-DATA]` — Deletion is a soft delete
- [ ] **TC-ADM-COL-038** `[PROD-DATA]` — Products in it are **not** deleted
  - **Steps:** 1. Delete a collection 2. Check its products still exist and remain
    on `/collection`
- [ ] **TC-ADM-COL-039** `[PROD-DATA]` — Its tab disappears from `/collection`
- [ ] **TC-ADM-COL-040** `[PROD-DATA]` — A homepage card for it disappears
- [ ] **TC-ADM-COL-041** `[LOCAL-ONLY]` — A failed delete silently leaves the row

---

## Cross-checks

- [ ] **TC-ADM-COL-045** `[PROD-DATA]` — A collection with zero products shows an empty tab
  - **Steps:** 1. Create a published collection with no product ids 2. Open
    `/collection` and click its tab
  - **Expect:** "0 items" and an empty grid — no crash, no error.
- [ ] **TC-ADM-COL-046** `[PROD-DATA]` — An unpublished product inside a collection is hidden
  - **Steps:** 1. Add product X to a collection 2. Unpublish X 3. View the tab
  - **Expect:** X is absent and the item count excludes it.
- [ ] **TC-ADM-COL-047** `[PROD-DATA]` — Deleting a product removes it from collection counts
