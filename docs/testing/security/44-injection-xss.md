# 44 — Injection & XSS

> **Clean up every payload immediately.** Several of these surfaces — the
> announcement bar, design settings, the footer doodle — appear on **every page of
> the site**. A forgotten test payload is a live defect.

Use a distinctive marker so you can find and remove everything afterwards:

```
ZZTEST-<payload>
```

**Area prefix:** `TC-SEC-XSS`

---

## Standard payloads

Try each of these in every field listed below.

| # | Payload | Detects |
|---|---|---|
| 1 | `<script>alert('ZZTEST')</script>` | raw HTML injection |
| 2 | `<img src=x onerror=alert('ZZTEST')>` | attribute-handler injection |
| 3 | `<svg onload=alert('ZZTEST')>` | SVG vector |
| 4 | `"><script>alert('ZZTEST')</script>` | attribute-context escape |
| 5 | `javascript:alert('ZZTEST')` | URL context |
| 6 | `<a href="javascript:alert(1)">ZZTEST</a>` | link injection |
| 7 | `{{7*7}}` / `${7*7}` | template injection — a rendered `49` is a finding |
| 8 | `ZZTEST & <> " '` | double-escaping check |

**Pass** = the payload renders as **visible literal text**, no alert fires, and
View Source shows `&lt;script&gt;`.

---

## Journal post body

The surface that was already fixed — confirm it holds.

- [ ] **TC-SEC-XSS-001** `[PROD-DATA]` — A script payload in a post body does not execute
  - **Steps:** 1. `/admin/blog` → New Post 2. Content = payloads 1, 2 and 3
    3. Publish 4. Wait for revalidation 5. Open the post with the Console open
  - **Expect:** **no alert.** The tags render as visible text.
  - **Verify in source:** `&lt;script&gt;` not `<script>`.
  - **Any alert is S1.**
  - **Cleanup:** delete the post.

- [ ] **TC-SEC-XSS-002** `[PROD-DATA]` — The excerpt is also safe
  - **Steps:** put payload 1 in the Excerpt and check `/journal`
- [ ] **TC-SEC-XSS-003** `[PROD-DATA]` — The title is safe on both index and post
- [ ] **TC-SEC-XSS-004** `[PROD-DATA]` — Payload 8 is not double-escaped
  - **Expect:** displays as `ZZTEST & <> " '`. Seeing `&amp;` on screen is a
    double-escaping bug — S4.

---

## Announcement bar — site-wide

**Highest-risk surface: it renders on every storefront page.**

- [ ] **TC-SEC-XSS-008** `[LOCAL-ONLY]` — Announcement text does not inject HTML
  - **Steps:** 1. `/admin/design` → Announcements → text = payload 2 2. Save
    3. Load `/` with the Console open
  - **Expect:** literal text, no alert. **An alert here is S1** — it fires for every
    visitor on every page.
  - **Cleanup:** restore the original text **immediately**.

- [ ] **TC-SEC-XSS-009** `[LOCAL-ONLY]` — The announcement link cannot be `javascript:`
  - **Steps:** 1. Set the link to payload 5 2. Save 3. Click the announcement
  - **Expect:** nothing executes. Record exactly what happens. ⚠ Related to KI-038.
  - **Cleanup:** clear the link.

---

## Design settings generally

Any admin can write arbitrary keys and values that feed site chrome.

- [ ] **TC-SEC-XSS-013** `[LOCAL-ONLY]` — Hero title, subtitle and tag are safe
- [ ] **TC-SEC-XSS-014** `[LOCAL-ONLY]` — Loom timeline kicker, title and body are safe
- [ ] **TC-SEC-XSS-015** `[LOCAL-ONLY]` — Manifesto quote and attribution are safe
- [ ] **TC-SEC-XSS-016** `[LOCAL-ONLY]` — Section header text is safe
- [ ] **TC-SEC-XSS-017** `[LOCAL-ONLY]` — Coin pocket specs and serial are safe
- [ ] **TC-SEC-XSS-018** `[LOCAL-ONLY]` — Hotspot card titles and subtitles are safe
- [ ] **TC-SEC-XSS-019** `[LOCAL-ONLY]` — Shared moment captions are safe
- [ ] **TC-SEC-XSS-020** `[LOCAL-ONLY]` — An arbitrary settings key can be written
  ```bash
  curl -s -X POST "$BASE/api/admin/design" \
    -H "cookie: naami_session=$SESSION_ADMIN" \
    -H 'content-type: application/json' \
    -d '{"zztest_arbitrary_key":"<script>alert(1)</script>"}'
  ```
  **Expect:** **200** — any key is accepted. Confirm it is not rendered anywhere,
  then delete it. Record the unconstrained key space as **S3**.

---

## Product data

- [ ] **TC-SEC-XSS-024** `[PROD-DATA]` — The product name is safe everywhere
  - **Steps:** 1. Set a test product's name to payload 2 2. Check `/collection`, the
    product page, search results, the cart, the checkout summary, the order page and
    admin tables
  - **Expect:** literal text in all eight places.
  - **Cleanup:** restore the name.
- [ ] **TC-SEC-XSS-025** `[PROD-DATA]` — The subtitle is safe
- [ ] **TC-SEC-XSS-026** `[PROD-DATA]` — Metafield names and descriptions are safe
- [ ] **TC-SEC-XSS-027** `[PROD-DATA]` — Size labels are safe
- [ ] **TC-SEC-XSS-028** `[PROD-DATA]` — Category and collection names are safe
- [ ] **TC-SEC-XSS-029** `[LOCAL-ONLY]` — An image URL cannot be `javascript:`
  ```bash
  curl -s -X PUT "$BASE/api/admin/products/1" \
    -H "cookie: naami_session=$SESSION_ADMIN" \
    -H 'content-type: application/json' \
    -d '{"images":[{"url":"javascript:alert(1)"}]}'
  ```
  **Expect:** ideally a 400. The validator only checks that `url` is a non-empty
  string — record what happens and how it renders. **S2** if it produces a clickable
  or executable link.
  - **Cleanup:** restore the images.

---

## Customer-supplied data reaching admin

The direction that matters most: a customer injecting into an **admin's** session.

- [ ] **TC-SEC-XSS-033** `[PROD-DATA]` — **Feedback comments cannot script the admin panel**
  - **Steps:** 1. As a customer, submit feedback with payload 2 in the comment
    2. Open `/admin/feedback` as an admin with the Console open
  - **Expect:** literal text, no alert. **An alert here is S1** — a customer would
    be executing script in an admin session with full privileges.
  - **Cleanup:** note the row.
- [ ] **TC-SEC-XSS-034** `[PROD-DATA]` — Shipping name and address are safe in admin
  - **Steps:** 1. Place a ₹1 order with payload 2 as the Full Name 2. View it in
    `/admin/orders` and the order detail
  - **Expect:** literal text everywhere.
  - **Note:** the address is not currently rendered in admin (KI-035), so test the
    name and re-test the address if that is ever fixed.
- [ ] **TC-SEC-XSS-035** `[PROD-DATA]` — The order confirmation email is safe
  - **Steps:** check the email produced by the order above
  - **Expect:** the payload appears as text, not markup.
- [ ] **TC-SEC-XSS-036** `[PROD-DATA]` — The invoice PDF is safe
  - **Steps:** generate the invoice for that order
  - **Expect:** it renders without error and shows the payload as text.

---

## Admin-supplied data reaching customers

- [ ] **TC-SEC-XSS-040** `[LOCAL-ONLY]` — The tracking URL cannot be `javascript:`
  - **See** `customer/10-order-detail.md` TC-ORD-037. ⚠ **KNOWN** KI-038.
- [ ] **TC-SEC-XSS-041** `[PROD-DATA]` — The tracking number and carrier are safe
- [ ] **TC-SEC-XSS-042** `[PROD-DATA]` — A status-change note never reaches the customer
  - **See** `admin/24-orders.md` TC-ADM-ORD-071.

---

## SQL injection

Queries go through Drizzle with parameter binding, so classic injection should be
impossible. Confirm, and check the wildcard cases which are **not** parameterised
away.

- [ ] **TC-SEC-XSS-046** `[PROD-SAFE]` — Search is not injectable
  - **Steps:** try `' OR '1'='1`, `'; DROP TABLE users; --`, `admin'--`
  - **Expect:** treated as literal search terms. No error, no unexpected results.
- [ ] **TC-SEC-XSS-047** `[PROD-SAFE]` — **Search wildcards are not escaped**
  - **Steps:** search `%` and `_`
  - **Expect:** confirm whether they act as SQL wildcards. If `%` returns the whole
    catalogue, record as **S3** — it is an availability concern, not injection.
- [ ] **TC-SEC-XSS-048** `[PROD-SAFE]` — Admin order search is not injectable
  - **Steps:** `?q=' OR 1=1--`
  - **Expect:** no results, no error. (Note `?q=%` does return everything — that is
    KI-006, covered in `42-access-control.md`.)
- [ ] **TC-SEC-XSS-049** `[PROD-SAFE]` — Coupon codes are not injectable
- [ ] **TC-SEC-XSS-050** `[PROD-SAFE]` — Numeric path params reject injection
  - **Steps:** `/api/products/1;DROP TABLE users`, `/api/products/1 OR 1=1`
  - **Expect:** **404** — coerced to `NaN`, no error.
- [ ] **TC-SEC-XSS-051** `[PROD-SAFE]` — Date filters reject injection
  - **Steps:** `/api/admin/orders?from=2026-01-01' OR '1'='1`
  - **Expect:** silently ignored — the format is strictly validated.

---

## Other injection surfaces

- [ ] **TC-SEC-XSS-055** `[PROD-SAFE]` — Header injection via user input
  - **Steps:** put `\r\nX-Injected: yes` in a shipping name and complete an order
  - **Expect:** no injected header appears in any response.
- [ ] **TC-SEC-XSS-056** `[PROD-DATA]` — Email header injection
  - **Steps:** a shipping name containing `\r\nBcc: attacker@example.com`
  - **Expect:** no extra recipient. Check the Resend dashboard for the actual
    recipient list.
- [ ] **TC-SEC-XSS-057** `[PROD-SAFE]` — Filename injection on upload
  - **Steps:** upload a file named `../../evil.jpg` and one named
    `<script>.jpg`
  - **Expect:** the resulting URL is slugified and stays inside the intended
    directory. **See also** `47-uploads-security.md`.
- [ ] **TC-SEC-XSS-058** `[PROD-SAFE]` — Very long input does not break anything
  - **Steps:** 10,000 characters into a shipping address, a search box and a
    feedback comment
  - **Expect:** rejected cleanly or truncated — never a 500 or a hang.
- [ ] **TC-SEC-XSS-059** `[PROD-SAFE]` — Null bytes are handled
  - **Steps:** include `%00` in a search query and a product name
- [ ] **TC-SEC-XSS-060** `[PROD-SAFE]` — Unicode and emoji are handled
  - **Steps:** use `🔥`, RTL marks and combining characters in a product name and a
    shipping address
  - **Expect:** stored and rendered correctly, no layout break, and correct in the
    order email and PDF.

---

## Cleanup

Run at the end of the session and confirm nothing is left:

```sql
SELECT id, name        FROM products     WHERE name    LIKE '%ZZTEST%';
SELECT id, title       FROM blog_posts   WHERE title   LIKE '%ZZTEST%' OR content LIKE '%ZZTEST%';
SELECT id, comment     FROM brand_feedback WHERE comment LIKE '%ZZTEST%';
SELECT id, shipping_name FROM orders     WHERE shipping_name LIKE '%ZZTEST%';
SELECT key, value      FROM design_settings WHERE value LIKE '%ZZTEST%' OR key LIKE '%zztest%';
```

All five must return zero rows before you finish.
