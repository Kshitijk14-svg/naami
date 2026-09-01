# 22 — Products

`/admin/products`, `/admin/products/new`, `/admin/products/[id]/edit`

Sixteen form fields plus three sub-widgets. This is the largest form in the
application and contains KI-013 (the `NaN` price hole).

**Area prefix:** `TC-ADM-PRD`

---

## List

- [ ] **TC-ADM-PRD-001** `[PROD-SAFE]` — Nine columns render
  - **Expect:** #, Name, Price, Category, Stock, Published, New Arrival, Bestseller,
    Actions.
- [ ] **TC-ADM-PRD-002** `[PROD-SAFE]` — Price uses Indian formatting with no decimals
- [ ] **TC-ADM-PRD-003** `[PROD-SAFE]` — Category shows the name, or `—` when unset
- [ ] **TC-ADM-PRD-004** `[PROD-DATA]` — An infinite-stock product shows `∞` in Stock
- [ ] **TC-ADM-PRD-005** `[PROD-SAFE]` — Published shows green "Yes" / red "No"
- [ ] **TC-ADM-PRD-006** `[PROD-SAFE]` — Featured flags show a red ★ or a faint `—`
- [ ] **TC-ADM-PRD-007** `[PROD-SAFE]` — **There is no sort, pagination, filter or search**
  - **Expect:** confirm absence of all four. Row order is raw database order.
    Record as S3 — this does not scale past a few dozen products.
- [ ] **TC-ADM-PRD-008** `[PROD-SAFE]` — The table scrolls horizontally on a narrow screen
- [ ] **TC-ADM-PRD-009** `[PROD-SAFE]` — Unpublished and soft-deleted visibility
  - **Expect:** unpublished products **are** listed (with "No"). Confirm whether
    soft-deleted ones are too — they should not be.
- [ ] **TC-ADM-PRD-010** `[LOCAL-ONLY]` — A failed load shows "Failed to load products"

---

## Create — validation

- [ ] **TC-ADM-PRD-014** `[PROD-DATA]` — A minimal valid product saves
  - **Steps:** 1. Name `ZZ TEST Product` 2. Price `100` 3. Stock `10` 4. Save
  - **Expect:** redirected to the list with the product present.
- [ ] **TC-ADM-PRD-015** `[PROD-DATA]` — An empty **name** is rejected
  - **Expect:** "name, priceINR, and stock are required"
- [ ] **TC-ADM-PRD-016** `[PROD-DATA]` — **An empty Price is accepted and breaks** ⚠ **KNOWN** KI-013
  - **Steps:** 1. Fill Name 2. **Leave Price completely empty** 3. Fill Stock
    4. Save
  - **Expect:** it should be rejected with the required-fields error. **Known
    defect:** `Number("")` is `NaN` and `typeof NaN === "number"`, so validation
    passes and the insert fails — you will likely get a bare 500 and "Save failed".
  - **Record the exact behaviour and check no half-created row exists.**
- [ ] **TC-ADM-PRD-017** `[PROD-DATA]` — An empty Stock behaves the same way
- [ ] **TC-ADM-PRD-018** `[PROD-DATA]` — A **negative** price is accepted
  - **Steps:** 1. Price `-500` 2. Save
  - **Expect:** it saves. There is no positivity check. Then check the storefront —
    record how a negative price renders and whether it can be added to a cart.
    Report as **S2** if it can be purchased.
  - **Cleanup:** delete the product.
- [ ] **TC-ADM-PRD-019** `[PROD-DATA]` — A decimal price is accepted
  - **Steps:** 1. Price `99.99` 2. Save 3. Check what was stored
- [ ] **TC-ADM-PRD-020** `[PROD-DATA]` — A negative stock is accepted by the form
  - **Note:** the database now has `CHECK (stock >= 0)`, so this should fail at the
    insert. Record which layer catches it.
- [ ] **TC-ADM-PRD-021** `[PROD-DATA]` — A Number longer than 10 characters
  - **Steps:** 1. Enter `12345678901234` in Number 2. Save
  - **Expect:** the column is `varchar(10)` with **no `maxLength` on the input**, so
    expect a database error surfacing as "Save failed". Record as S3.

### Compare-at price

- [ ] **TC-ADM-PRD-025** `[PROD-DATA]` — A compare-at below the price shows a warning
  - **Steps:** 1. Price `1000` 2. Compare-at `500`
  - **Expect:** an inline warning: "Compare-at price should be higher than the
    actual price to show a discount."
- [ ] **TC-ADM-PRD-026** `[PROD-DATA]` — That warning does **not** block saving
  - **Expect:** Save succeeds anyway. Confirm the storefront shows no discount badge.
- [ ] **TC-ADM-PRD-027** `[PROD-DATA]` — Compare-at `0` is rejected
  - **Expect:** "compareAtPriceInr must be a positive number or null"
- [ ] **TC-ADM-PRD-028** `[PROD-DATA]` — A negative compare-at is rejected identically
- [ ] **TC-ADM-PRD-029** `[PROD-DATA]` — An empty compare-at is accepted as null

---

## Stock & sizes

- [ ] **TC-ADM-PRD-033** `[PROD-DATA]` — "Infinite stock" disables Stock and Threshold
  - **Expect:** both inputs grey out at reduced opacity.
- [ ] **TC-ADM-PRD-034** `[PROD-DATA]` — Adding a size disables the Stock field
  - **Expect:** Stock becomes read-only and its label changes to
    "Stock (auto-calculated from sizes below)".
- [ ] **TC-ADM-PRD-035** `[PROD-DATA]` — Stock shows the live sum of size stocks
  - **Steps:** 1. Sizes S=5, M=3, L=2 2. Read the Stock field
  - **Expect:** `10`, updating as you edit.
- [ ] **TC-ADM-PRD-036** `[PROD-DATA]` — Removing all sizes re-enables Stock
- [ ] **TC-ADM-PRD-037** `[PROD-DATA]` — A new product defaults to S/M/L/XL at stock 0
- [ ] **TC-ADM-PRD-038** `[PROD-DATA]` — A size label is capped at 10 characters
- [ ] **TC-ADM-PRD-039** `[PROD-DATA]` — Enter in the size box adds the size
- [ ] **TC-ADM-PRD-040** `[PROD-DATA]` — **Duplicate sizes are silently ignored**
  - **Steps:** 1. With size `M` present, type `m` and click + Add
  - **Expect:** nothing is added and the input clears, with **no message**. Case
    insensitive. Record as S4.
- [ ] **TC-ADM-PRD-041** `[PROD-DATA]` — An empty size label is ignored
- [ ] **TC-ADM-PRD-042** `[PROD-DATA]` — A negative size stock clamps to 0
  - **Steps:** 1. Type `-5` into a size's stock
  - **Expect:** it becomes `0` immediately.
- [ ] **TC-ADM-PRD-043** `[PROD-DATA]` — Non-numeric size stock becomes 0
- [ ] **TC-ADM-PRD-044** `[PROD-DATA]` — The × removes a size with **no confirmation**
- [ ] **TC-ADM-PRD-045** `[PROD-DATA]` — Removing a size deletes its stock
  - **Steps:** 1. Remove size M (stock 3) 2. Save 3. Reopen
  - **Expect:** M is gone and total stock dropped by 3.
- [ ] **TC-ADM-PRD-046** `[PROD-DATA]` — Empty state text appears with no sizes
  - **Expect:** "No sizes added yet — product stock is managed by the Stock field
    above."

---

## Metafields

- [ ] **TC-ADM-PRD-050** `[PROD-DATA]` — "+ Add metafield" appends a blank row
- [ ] **TC-ADM-PRD-051** `[PROD-DATA]` — Name is capped at 100 characters
- [ ] **TC-ADM-PRD-052** `[PROD-DATA]` — Description has **no** length cap
  - **Steps:** 1. Paste 5000 characters 2. Save
  - **Expect:** accepted — the column is `text`. Check how the product page renders
    it.
- [ ] **TC-ADM-PRD-053** `[PROD-DATA]` — Rows with a blank **name** are dropped on save
  - **Steps:** 1. Add a row with an empty name but a description 2. Save 3. Reopen
  - **Expect:** the row is gone, silently.
- [ ] **TC-ADM-PRD-054** `[PROD-DATA]` — A name with an empty description is kept
- [ ] **TC-ADM-PRD-055** `[PROD-DATA]` — "Remove" deletes a row with no confirmation
- [ ] **TC-ADM-PRD-056** `[PROD-DATA]` — Metafields appear on the product page in order
  - **Steps:** 1. Add three metafields 2. View `/product/{id}`
  - **Expect:** all three in the same order. Carousel quick-views show only the
    first three.

---

## Images

- [ ] **TC-ADM-PRD-060** `[PROD-DATA]` — The label shows the count as `Images (n/6)`
- [ ] **TC-ADM-PRD-061** `[PROD-DATA]` — Multiple files upload sequentially
  - **Expect:** progress reads "Uploading N of M…".
- [ ] **TC-ADM-PRD-062** `[PROD-DATA]` — Six images fills the limit and disables the input
- [ ] **TC-ADM-PRD-063** `[PROD-DATA]` — Selecting more than the remaining slots is refused
  - **Steps:** 1. With 4 images present, select 3 files
  - **Expect:** "A product can have at most 6 images (4 already added)." and
    **nothing uploads** — not even the first two.
- [ ] **TC-ADM-PRD-064** `[PROD-DATA]` — The first card is badged "Main"
- [ ] **TC-ADM-PRD-065** `[PROD-DATA]` — Dragging reorders the cards
- [ ] **TC-ADM-PRD-066** `[PROD-DATA]` — The new first image becomes the product's main image
  - **Steps:** 1. Drag the third image to first 2. Save 3. Check the product card
    on `/collection`
- [ ] **TC-ADM-PRD-067** `[PROD-DATA]` — "Remove" deletes an image with no confirmation
- [ ] **TC-ADM-PRD-068** `[PROD-DATA]` — **Saving after a removal deletes the file from disk**
  - **Steps:** 1. Note an image URL 2. Remove it 3. Save 4. Request the URL directly
  - **Expect:** 404. This is irreversible — worth knowing before you remove
    anything real.
- [ ] **TC-ADM-PRD-069** `[PROD-DATA]` — Removing every image restores the default placeholder
- [ ] **TC-ADM-PRD-070** `[PROD-DATA]` — A partial upload failure keeps earlier successes
  - **Steps:** 1. Select 3 files where the second is invalid
  - **Expect:** the first uploads, the loop stops at the failure, and the first
    remains in the form. Record whether that is obvious to the user.

---

## Flags & save

- [ ] **TC-ADM-PRD-074** `[PROD-DATA]` — Published defaults to checked on a new product
- [ ] **TC-ADM-PRD-075** `[PROD-DATA]` — Unpublishing hides it from `/collection` and 404s its page
- [ ] **TC-ADM-PRD-076** `[PROD-DATA]` — "New Arrival" makes it appear in that carousel
- [ ] **TC-ADM-PRD-077** `[PROD-DATA]` — "Bestseller" likewise
- [ ] **TC-ADM-PRD-078** `[PROD-DATA]` — Homepage Sort Order affects carousel position
- [ ] **TC-ADM-PRD-079** `[PROD-DATA]` — Category assignment shows in the list column
- [ ] **TC-ADM-PRD-080** `[PROD-DATA]` — Cancel discards changes with **no warning**
  - **Steps:** 1. Change the name 2. Click Cancel
  - **Expect:** you leave and the change is lost, with no "unsaved changes" prompt.
    Record as S3.
- [ ] **TC-ADM-PRD-081** `[PROD-DATA]` — Save shows "Saving…" and disables the button
- [ ] **TC-ADM-PRD-082** `[PROD-DATA]` — A server error renders in the red banner

---

## Edit

- [ ] **TC-ADM-PRD-086** `[PROD-DATA]` — Every field prefills correctly
- [ ] **TC-ADM-PRD-087** `[PROD-DATA]` — **An existing product can be renamed to empty**
  - **Steps:** 1. Open an existing product 2. Clear the Name field 3. Save
  - **Expect:** it should be rejected. ⚠ **KNOWN** KI-013 — PUT never re-checks
    `name`, so it likely saves with a blank name. Then check `/collection` and
    record how a nameless product renders.
  - **Cleanup:** restore the name.
- [ ] **TC-ADM-PRD-088** `[PROD-DATA]` — Editing only one field leaves the rest untouched
- [ ] **TC-ADM-PRD-089** `[PROD-DATA]` — Changes appear on the storefront
  - **Note:** products are Redis-cached — allow up to five minutes, or verify the
    cache is busted on save.

---

## Low-stock alert

- [ ] **TC-ADM-PRD-093** `[PROD-DATA]` — Dropping below the threshold sends one email
  - **Steps:** 1. Threshold 5, stock 10 2. Save 3. Change stock to 3 4. Save
  - **Expect:** one `email:low_stock` job is enqueued and one email arrives at
    `ADMIN_EMAIL`.
- [ ] **TC-ADM-PRD-094** `[PROD-DATA]` — Saving again at the same low stock sends **nothing**
  - **Expect:** no second email — the trigger is edge-based, not level-based.
- [ ] **TC-ADM-PRD-095** `[PROD-DATA]` — Going back above and below again re-triggers it
- [ ] **TC-ADM-PRD-096** `[PROD-DATA]` — An infinite-stock product never triggers it

---

## Delete

- [ ] **TC-ADM-PRD-100** `[PROD-DATA]` — Delete asks for confirmation
  - **Expect:** "Delete this item? This cannot be undone."
- [ ] **TC-ADM-PRD-101** `[PROD-DATA]` — Cancelling the dialog keeps the product
- [ ] **TC-ADM-PRD-102** `[PROD-DATA]` — Confirming removes it from the list immediately
  - **Note:** removal is optimistic — the row goes before the request resolves.
- [ ] **TC-ADM-PRD-103** `[LOCAL-ONLY]` — A failed delete restores the row
  - **Steps:** 1. Block `/api/admin/products/*` 2. Delete
  - **Expect:** the row returns and "Failed to delete product" appears.
- [ ] **TC-ADM-PRD-104** `[PROD-DATA]` — Deletion is a **soft delete**
  ```sql
  SELECT id, name, deleted_at FROM products WHERE name LIKE 'ZZ TEST%';
  ```
  **Expect:** the row still exists with `deleted_at` set.
- [ ] **TC-ADM-PRD-105** `[PROD-DATA]` — A deleted product disappears from the storefront
- [ ] **TC-ADM-PRD-106** `[PROD-DATA]` — Past orders still show the deleted product's name
  - **Steps:** 1. Open an order containing it
  - **Expect:** the line still renders — order items store their own snapshot.
- [ ] **TC-ADM-PRD-107** `[PROD-DATA]` — There is no way to restore a deleted product
  - **Expect:** confirm absence from the UI. Recovery is a manual SQL `UPDATE`.
