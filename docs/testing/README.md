# NAAMI — Manual Test Suite

Every page, feature, button, error path and security control, written to be run by
hand against a real browser. Coverage was derived from the source, not guessed:
11 customer pages, 17 admin pages, ~47 components, 54 API routes.

---

## How to use this

1. Read [`00-setup.md`](00-setup.md) first — you need four accounts, a ₹1 test
   product, and browser devtools open. Nothing else works until that is done.
2. Skim [`KNOWN-ISSUES.md`](KNOWN-ISSUES.md). Roughly 40 defects were found during
   the code review. **They are already logged — do not spend time rediscovering
   them.** Cases that reproduce a known issue are marked `⚠ KNOWN` and tell you
   what you should see today versus what is correct.
3. Work through a file top to bottom, ticking `- [ ]` → `- [x]` as you go.
4. Anything that fails and is *not* in `KNOWN-ISSUES.md` gets a bug report using
   the template at the bottom of this file.

Files are numbered so the numbering is the suggested running order. You do not
have to follow it, but `customer/` before `admin/` before `security/` means each
section builds on data the previous one created.

---

## Test case IDs

```
TC-<AREA>-<NNN>
```

`TC-CART-012`, `TC-SEC-PAY-003`, `TC-ADM-ORD-021`.

IDs are **stable and append-only**. If a case is removed, leave the ID retired —
never renumber, because bug reports and past run results reference them.

---

## Environment tags

**Every case carries one.** The manual suite runs against **live production**
(`naamiofficial.in`), so this matters.

| Tag | Meaning |
|---|---|
| `[PROD-SAFE]` | Read-only. Run any time, including during business hours. |
| `[PROD-DATA]` | Creates or modifies real data. Cleanup steps are given with the case. Prefer off-peak. |
| `[LOCAL-ONLY]` | **Never run against production.** Destructive, or it deliberately triggers failures that would affect real customers. |

If a case has no tag, treat it as `[LOCAL-ONLY]` and raise it — that is a bug in
this document.

---

## Case format

```markdown
- [ ] **TC-CART-007** `[PROD-DATA]` — Quantity stepper cannot go below 1
  - **Pre:** cart contains exactly one line, quantity 1
  - **Steps:** 1. Click "−" on that line
  - **Expect:** the line is removed entirely and the cart shows the empty state.
    No confirmation dialog appears.
  - **Cleanup:** none
```

Every case has exactly **one unambiguous expected result**. If you find yourself
unsure whether something passed, the case is badly written — flag it.

---

## Severity, when you file something

| Level | Meaning |
|---|---|
| **S1 Critical** | Money is wrong, data is lost, or a customer can access another customer's data. Stop and report immediately. |
| **S2 Major** | A core journey is blocked with no workaround — cannot check out, cannot log in, cannot fulfil an order. |
| **S3 Minor** | Works, but wrongly — bad copy, wrong number, broken layout, missing error message. |
| **S4 Cosmetic** | Visual polish, spacing, a misaligned icon. |

---

## Bug report template

```markdown
### BUG-000 — <one-line summary>

- **Test case:** TC-XXX-000
- **Severity:** S1 / S2 / S3 / S4
- **Environment:** production / local · Chrome 141 / Safari 18 · desktop / iPhone 15
- **Account:** customer / staff / admin / super_admin / logged out

**Steps to reproduce**
1.
2.

**Expected**

**Actual**

**Evidence**
Screenshot, DevTools Console output, Network tab (request + response body),
order ID, timestamp.
```

Always capture the **Network tab response body** for anything API-related — the
status code alone is rarely enough to diagnose.

---

## Run results

Copy this table into your run notes and fill it in.

| Area | File | Cases | Pass | Fail | Blocked | Notes |
|---|---|---:|---:|---:|---:|---|
| Global chrome | `customer/01-global-chrome.md` | | | | | |
| Homepage | `customer/02-homepage.md` | | | | | |
| Homepage shopping | `customer/03-homepage-shopping.md` | | | | | |
| Collection | `customer/04-collection.md` | | | | | |
| Product detail | `customer/05-product-detail.md` | | | | | |
| Cart | `customer/06-cart.md` | | | | | |
| Checkout | `customer/07-checkout.md` | | | | | |
| Auth | `customer/08-auth.md` | | | | | |
| Profile | `customer/09-profile.md` | | | | | |
| Order detail | `customer/10-order-detail.md` | | | | | |
| Journal & About | `customer/11-journal-about.md` | | | | | |
| Admin access | `admin/20-access-roles.md` | | | | | |
| Dashboard | `admin/21-dashboard-analytics.md` | | | | | |
| Products | `admin/22-products.md` | | | | | |
| Categories & Collections | `admin/23-categories-collections.md` | | | | | |
| Orders | `admin/24-orders.md` | | | | | |
| Coupons | `admin/25-coupons.md` | | | | | |
| Blog | `admin/26-blog.md` | | | | | |
| Design Manager | `admin/27-design-manager.md` | | | | | |
| Feedback | `admin/28-feedback.md` | | | | | |
| Uploads | `admin/29-uploads.md` | | | | | |
| Responsive | `cross-cutting/30-responsive.md` | | | | | |
| Error states | `cross-cutting/31-error-states.md` | | | | | |
| Emails | `cross-cutting/32-emails.md` | | | | | |
| Motion & a11y | `cross-cutting/33-motion-accessibility.md` | | | | | |
| Security | `security/*.md` | | | | | |

---

## Automated tests

The money logic — the purchase race, payment tampering, webhook signatures — is
covered by [`../../tests/`](../../tests) rather than by hand, because those
failures are invisible to clicking and cost real money.

```bash
npm test
```

Four suites, ~98 cases: the purchase race, payment binding, webhook signatures,
and a route-status smoke check. Full detail in [`../../tests/README.md`](../../tests/README.md).

**Those tests are local-only.** They set stock to 1, forge HMAC signatures and
insert checkout intents. `tests/helpers/setup.ts` aborts unless `DATABASE_URL`
points at localhost, and there is no override. Never point them at production.
