# 28 — Feedback

`/admin/feedback`

Read-mostly: the only action is an approve/unapprove toggle. Feedback cannot be
created, edited or deleted from the admin.

**Area prefix:** `TC-ADM-FBK`

---

## List

- [ ] **TC-ADM-FBK-001** `[PROD-SAFE]` — Five columns render
  - **Expect:** Rating, Comment, Order, Date, Approved.
- [ ] **TC-ADM-FBK-002** `[PROD-SAFE]` — **There is no Add button and no Actions column**
  - **Expect:** confirm — feedback can only arrive from customers.
- [ ] **TC-ADM-FBK-003** `[PROD-SAFE]` — Rating renders as filled and faint stars
  - **Expect:** a 3-star rating shows three red ★ and two faint ★.
- [ ] **TC-ADM-FBK-004** `[PROD-SAFE]` — A missing comment or order shows `—`
- [ ] **TC-ADM-FBK-005** `[PROD-SAFE]` — Feedback is newest first
- [ ] **TC-ADM-FBK-006** `[PROD-SAFE]` — No sort, pagination, search or rating filter
  - **Expect:** confirm absence of all four. Record as S3 — there is no way to find
    the 1-star reviews.
- [ ] **TC-ADM-FBK-007** `[PROD-SAFE]` — Dates use `en-IN` with no timezone conversion
- [ ] **TC-ADM-FBK-008** `[PROD-DATA]` — A long comment stretches the row
  - **Pre:** feedback with a 1000-character comment
  - **Expect:** no truncation and no wrapping limit — the row grows. Record how
    readable the table stays. S4.
- [ ] **TC-ADM-FBK-009** `[LOCAL-ONLY]` — A failed load shows "Failed to load"

---

## Approval toggle

- [ ] **TC-ADM-FBK-013** `[PROD-DATA]` — Unapproved shows a red outlined "Approve" button
- [ ] **TC-ADM-FBK-014** `[PROD-DATA]` — Approved shows a green outlined "Approved" button
- [ ] **TC-ADM-FBK-015** `[PROD-DATA]` — Clicking toggles state immediately
  - **Expect:** the change is optimistic — the button flips before the request
    resolves.
- [ ] **TC-ADM-FBK-016** `[PROD-DATA]` — The change persists across a reload
- [ ] **TC-ADM-FBK-017** `[PROD-DATA]` — Toggling back works
- [ ] **TC-ADM-FBK-018** `[PROD-DATA]` — There is **no confirmation** on either direction
- [ ] **TC-ADM-FBK-019** `[LOCAL-ONLY]` — A failed toggle reverts just that row
  - **Steps:** 1. Block `/api/admin/feedback/*` 2. Click a toggle
  - **Expect:** the button flips, then flips back, and **"Failed to update
    approval"** appears. Other rows are unaffected.
- [ ] **TC-ADM-FBK-020** `[PROD-SAFE]` — There is no bulk approve
- [ ] **TC-ADM-FBK-021** `[LOCAL-ONLY]` — A non-boolean value is rejected
  ```bash
  curl -s -X PATCH "$BASE/api/admin/feedback/1" \
    -H "cookie: naami_session=$SESSION_ADMIN" \
    -H 'content-type: application/json' -d '{"isApproved":"yes"}'
  ```
  **Expect:** **400** `{"error":"isApproved (boolean) is required."}`
- [ ] **TC-ADM-FBK-022** `[LOCAL-ONLY]` — A nonexistent id returns 404

---

## What approval actually does

- [ ] **TC-ADM-FBK-026** `[PROD-DATA]` — Determine where approved feedback appears
  - **Steps:** 1. Approve a piece of feedback 2. Search the storefront for it —
    homepage, product pages, a testimonials section
  - **Expect:** **record what you find.** If approved feedback is not surfaced
    anywhere on the site, the toggle currently has no visible effect, which is worth
    logging as a product gap (S3) so it is a deliberate decision rather than an
    oversight.

---

## Data integrity

- [ ] **TC-ADM-FBK-030** `[PROD-DATA]` — Customer feedback appears here
  - **Steps:** 1. Submit feedback from a delivered order 2. Reload this page
- [ ] **TC-ADM-FBK-031** `[PROD-DATA]` — The order id links the feedback to its order
- [ ] **TC-ADM-FBK-032** `[PROD-DATA]` — Feedback with no order id renders fine
- [ ] **TC-ADM-FBK-033** `[LOCAL-ONLY]` — **An out-of-range rating crashes the row**
  - **Steps:** insert a bad row directly — there is no database constraint:
    ```sql
    INSERT INTO brand_feedback (user_id, rating, comment, created_at)
    VALUES (1, 0, 'ZZ TEST bad rating', now());
    ```
    then load `/admin/feedback`
  - **Expect:** the star renderer does `"★".repeat(rating)`. Record whether the page
    crashes, renders oddly, or copes.
  - ⚠ **KNOWN** KI-037 — no `CHECK` constraint on `brand_feedback.rating`.
  - **Cleanup:**
    ```sql
    DELETE FROM brand_feedback WHERE comment = 'ZZ TEST bad rating';
    ```
- [ ] **TC-ADM-FBK-034** `[LOCAL-ONLY]` — A negative rating is worse
  - **Steps:** same as above with `rating = -1`
  - **Expect:** `"★".repeat(-1)` throws a RangeError. Record whether the whole page
    fails to render.
  - **Cleanup:** delete the row.
- [ ] **TC-ADM-FBK-035** `[PROD-SAFE]` — Comment text is not HTML-injectable
  - **Steps:** 1. Submit feedback whose comment is `<img src=x onerror=alert(1)>`
    2. Open this page with the Console open
  - **Expect:** it renders as visible text with **no alert**. **If an alert fires,
    report S1** — a customer would be executing script in an admin session.
  - **Cleanup:** note the row for deletion.
