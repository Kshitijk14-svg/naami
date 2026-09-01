# 20 — Admin Access & Roles

Three independent gating layers protect `/admin`, and they do **not** agree with
each other. Test all three.

| Layer | Where | Reads role from |
|---|---|---|
| Edge proxy | `src/proxy.ts:23-41` | **the JWT claim** |
| Server layout | `src/app/admin/layout.tsx:13` | the JWT claim |
| API | `src/lib/adminAuth.ts:36` | **the database**, for privileged roles |

The practical consequence: a demoted admin keeps the *page shell* until their token
expires, but every API call fails immediately.

**Area prefix:** `TC-ADM-ACC`

---

## Role matrix

The sidebar filters links by role. Verify each cell.

| Nav item | staff | admin | super_admin |
|---|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ✅ |
| Products | ❌ | ✅ | ✅ |
| Collections | ❌ | ✅ | ✅ |
| Categories | ❌ | ✅ | ✅ |
| Coupons | ❌ | ✅ | ✅ |
| **Orders** | ✅ | ✅ | ✅ |
| Blog | ❌ | ✅ | ✅ |
| Design | ❌ | ✅ | ✅ |
| Feedback | ❌ | ✅ | ✅ |

**`admin` and `super_admin` are functionally identical** — no route anywhere is
restricted to `super_admin` alone.

---

## Unauthenticated access

- [ ] **TC-ADM-ACC-001** `[PROD-SAFE]` — `/admin` signed out redirects to `/auth?from=/admin`
- [ ] **TC-ADM-ACC-002** `[PROD-SAFE]` — Every admin sub-page redirects the same way
  - **Steps:** try `/admin/products`, `/admin/orders`, `/admin/coupons`,
    `/admin/design`, `/admin/blog`, `/admin/analytics`
- [ ] **TC-ADM-ACC-003** `[PROD-SAFE]` — Signing in returns you to the requested page
- [ ] **TC-ADM-ACC-004** `[PROD-SAFE]` — Admin APIs return 401 with no session
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/admin/products"
  curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/admin/orders"
  ```
  **Expect:** `401` for both.

---

## Customer access

- [ ] **TC-ADM-ACC-008** `[PROD-SAFE]` — A customer visiting `/admin` is sent to `/`
  - **Expect:** redirected to the homepage, **with no `?from=`** — a deliberate
    difference from the signed-out case.
- [ ] **TC-ADM-ACC-009** `[PROD-SAFE]` — A customer gets 403 from every admin API
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/admin/products" \
    -H "cookie: naami_session=$SESSION_CUSTOMER"
  ```
  **Expect:** `403` — Forbidden, not 401. A 401 would mean the session was
  rejected rather than the role.
- [ ] **TC-ADM-ACC-010** `[PROD-SAFE]` — No "Admin Dashboard" link for a customer
  - **Steps:** check both the profile dropdown and the mobile menu

---

## Staff access

- [ ] **TC-ADM-ACC-014** `[PROD-SAFE]` — Staff reach `/admin` successfully
- [ ] **TC-ADM-ACC-015** `[PROD-SAFE]` — The sidebar shows **only** Dashboard and Orders
- [ ] **TC-ADM-ACC-016** `[PROD-SAFE]` — The dashboard shows only the Orders tile
- [ ] **TC-ADM-ACC-017** `[PROD-SAFE]` — Staff can open and edit an order
- [ ] **TC-ADM-ACC-018** `[PROD-SAFE]` — **Typing an admin-only URL directly gives a broken page**
  - **Steps:** 1. Signed in as staff 2. Type `/admin/products` into the address bar
  - **Expect:** the shell renders, the API 403s, and the page shows an error state
    or crashes rather than redirecting.
  - ⚠ **KNOWN** KI-012. **Record exactly what appears** — a blank page, a React
    error overlay, or an error message — for each of: `/admin/products`,
    `/admin/analytics`, `/admin/coupons`, `/admin/blog`, `/admin/categories`,
    `/admin/collections`, `/admin/feedback`, `/admin/design`.
- [ ] **TC-ADM-ACC-019** `[PROD-SAFE]` — Staff get 403 from admin-only APIs
  ```bash
  for p in products categories collections coupons blog design feedback analytics; do
    printf '%-12s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' \
      "$BASE/api/admin/$p" -H "cookie: naami_session=$SESSION_STAFF")"
  done
  ```
  **Expect:** `403` for every one.
- [ ] **TC-ADM-ACC-020** `[PROD-SAFE]` — Staff get 200 from order APIs
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/admin/orders" \
    -H "cookie: naami_session=$SESSION_STAFF"
  ```
  **Expect:** `200`.
- [ ] **TC-ADM-ACC-021** `[PROD-SAFE]` — Staff **cannot** create or delete products
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/admin/products" \
    -H "cookie: naami_session=$SESSION_STAFF" -H 'content-type: application/json' \
    -d '{"name":"ZZ TEST","priceINR":1,"stock":1}'
  ```
  **Expect:** `403`, and no product is created.

---

## Admin and super-admin

- [ ] **TC-ADM-ACC-025** `[PROD-SAFE]` — An admin sees all ten sidebar items
- [ ] **TC-ADM-ACC-026** `[PROD-SAFE]` — A super-admin sees exactly the same ten
- [ ] **TC-ADM-ACC-027** `[PROD-SAFE]` — Admin and super-admin can do the same things everywhere
  - **Steps:** pick one create, one edit and one delete in each section and confirm
    both roles succeed
  - **Expect:** no difference. Record this — if a super-admin-only capability is
    expected, it does not exist.
- [ ] **TC-ADM-ACC-028** `[PROD-SAFE]` — The topbar role badge shows the correct label

---

## Revocation

The important behaviour introduced by the security work.

- [ ] **TC-ADM-ACC-032** `[PROD-DATA]` — **Demotion takes effect immediately on APIs**
  - **Steps:**
    1. Sign in as the admin account, open `/admin/products` and confirm it loads
    2. Without touching the browser, run:
       ```sql
       UPDATE users SET role = 'customer' WHERE email = 'you+naamiadmin@gmail.com';
       ```
    3. In the same browser session, reload `/admin/products`
  - **Expect:** the API now returns **403** and the product list fails to load — the
    role is re-read from the database on every privileged call.
  - **Cleanup:**
    ```sql
    UPDATE users SET role = 'admin' WHERE email = 'you+naamiadmin@gmail.com';
    ```
    then sign out and in again.

- [ ] **TC-ADM-ACC-033** `[PROD-DATA]` — The demoted user still reaches the page shell
  - **Steps:** after demoting, navigate to `/admin`
  - **Expect:** the shell may still render because the proxy trusts the token claim.
    The data is gone. Record what the user actually sees.

- [ ] **TC-ADM-ACC-034** `[PROD-DATA]` — A soft-deleted admin is locked out immediately
  - **Steps:**
    ```sql
    UPDATE users SET deleted_at = now() WHERE email = 'you+naamistaff@gmail.com';
    ```
    then reload an admin page in that session
  - **Expect:** **401** from the API.
  - **Cleanup:** `UPDATE users SET deleted_at = NULL WHERE email = '…';`

- [ ] **TC-ADM-ACC-035** `[PROD-DATA]` — **Promotion does not take effect until re-login**
  - **Steps:** 1. As a signed-in customer, promote yourself to `admin` in the DB
    2. Reload `/admin` without signing out
  - **Expect:** still redirected to `/` — the token claim is still `customer` and
    the DB lookup only runs for tokens that already claim a privileged role.
  - **Then:** sign out and in, and confirm access is granted.
  - **Cleanup:** restore the role.

- [ ] **TC-ADM-ACC-036** `[PROD-SAFE]` — Signing out ends admin access at once

---

## Shell

- [ ] **TC-ADM-ACC-040** `[PROD-SAFE]` — The topbar shows the wordmark, role badge, name and View Site
- [ ] **TC-ADM-ACC-041** `[PROD-SAFE]` — "View Site" opens `/`
- [ ] **TC-ADM-ACC-042** `[PROD-SAFE]` — Sign Out works and returns to `/`
- [ ] **TC-ADM-ACC-043** `[PROD-SAFE]` — The active sidebar link is highlighted
  - **Expect:** maroon text with a left border. `/admin` highlights only on exact
    match; the others on prefix.
- [ ] **TC-ADM-ACC-044** `[PROD-SAFE]` — Mobile: a hamburger opens the sidebar drawer
- [ ] **TC-ADM-ACC-045** `[PROD-SAFE]` — Tapping a link closes the drawer and navigates
- [ ] **TC-ADM-ACC-046** `[PROD-SAFE]` — The custom cursor is **not** used in admin
  - **Expect:** a normal system cursor throughout.
- [ ] **TC-ADM-ACC-047** `[PROD-SAFE]` — The dashboard has no Feedback tile
  - **Expect:** Feedback is in the sidebar but has no tile. ⚠ **KNOWN** KI-042.
