# 00 — Setup

Everything you need in place before running any checklist. Budget about 45 minutes
the first time.

---

## 1. Accounts

You need **four**. Signup is OTP-based, so each needs a mailbox you can read.
Gmail `+` addressing works — `you+naamicustomer@gmail.com` and
`you+naamistaff@gmail.com` both land in the same inbox.

| Role | Purpose |
|---|---|
| `customer` | The default. Everything a shopper does. |
| `staff` | Orders only. Used to prove privilege boundaries. |
| `admin` | Everything except nothing — `admin` and `super_admin` are functionally identical across the whole API. |
| `super_admin` | Same permissions as `admin`; exists to confirm that. |

### Creating them

Sign up normally at `/auth` → Create Account for all four.

**Then promote three of them by hand.** There is **no admin UI to change a user's
role** — `src/models/roles.ts:8` only grants `super_admin` to the address in
`SUPER_ADMIN_EMAIL`, at account-creation time. Everything else is a direct
`UPDATE`:

```sql
UPDATE users SET role = 'staff'       WHERE email = 'you+naamistaff@gmail.com';
UPDATE users SET role = 'admin'       WHERE email = 'you+naamiadmin@gmail.com';
UPDATE users SET role = 'super_admin' WHERE email = 'you+naamisuper@gmail.com';
```

> **Sign out and back in after promoting.** The role is baked into the JWT at
> login. The API re-reads it from the database on every privileged call, but the
> edge proxy and the admin page shell read the token claim — so a freshly promoted
> user still gets bounced from `/admin` until they get a new token.

Record which address is which. Several security cases depend on knowing exactly
who is who.

---

## 2. The ₹1 test product

Production runs live Razorpay keys, so **every test purchase is a real charge**.
Razorpay test mode requires `rzp_test_` keys and will not work here.

Create a cheap, hidden product to buy repeatedly:

1. `/admin/products` → **+ Add New**
2. Name: `ZZ TEST — DO NOT SHIP`
3. Number: `999`
4. Price (INR): `1`
5. Leave **Infinite stock** unchecked, set **Stock** to a number you can burn
   through — but note that adding sizes overwrites the product stock with the sum
   of the size stocks.
6. Add one size, `TEST`, stock `50`.
7. **Uncheck Published.**
8. Save.

**Publish it only for the minutes you are running a payment case, then unpublish
it again.** While unpublished it 404s on `/product/{id}` and reports
`available: false` from the cart availability endpoint, so no real customer can
reach it.

You will need its numeric id from the URL — write it down as `TEST_PRODUCT_ID`.

### Refunding

After each real purchase, refund it in the Razorpay dashboard (Transactions →
find the payment → Refund). Then cancel the order in `/admin/orders/{id}` so
inventory and coupon usage are restored.

> Cancelling an order **restores stock, decrements `coupons.usedCount` and deletes
> the redemption row** (`src/db/queries/orders.ts:495-504`). That is deliberate —
> and it is also how you reset a per-user coupon cap between tests.

---

## 3. Tools

| Tool | Used for |
|---|---|
| **Chrome or Edge with DevTools** | Console, Network, Application (localStorage/cookies), device toolbar for responsive cases |
| **A second browser or a private window** | Two simultaneous sessions — needed for concurrency and cross-account cases |
| **`curl`** | Every API-level and security case. Windows: use Git Bash, not `cmd`. |
| **A phone on the same network** | Real touch testing. The device toolbar does not reproduce touch handlers faithfully — several homepage components branch on `pointer: coarse`. |
| **`psql` access** | Verifying database state after a case. |

### Base URLs

```bash
export BASE=https://naamiofficial.in     # manual suite
export BASE=http://localhost:3000        # automated suite / [LOCAL-ONLY] cases
```

### Capturing a session cookie for `curl`

DevTools → Application → Cookies → copy the `naami_session` value, then:

```bash
export SESSION='paste-the-cookie-value-here'
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/orders" -H "cookie: naami_session=$SESSION"
```

Keep a separate variable per account — `SESSION_CUSTOMER`, `SESSION_STAFF`,
`SESSION_ADMIN`. Half the access-control suite is "call X with account Y".

---

## 4. Data you will need

Have these to hand before starting. Note them in your run notes.

| Item | How to get it |
|---|---|
| `TEST_PRODUCT_ID` | From the URL after creating the ₹1 product |
| A published product **with** sizes | `/admin/products`, any normal product |
| A published product with **no** sizes | Create one, or find one — sizeless lines behave differently in the cart and on the order page |
| A product with `trackStock` **off** | Create one — it bypasses all stock checks |
| An **unpublished** product id | Needed for the enumeration cases |
| A test coupon | See below |
| Two order IDs owned by **different** accounts | Needed for the IDOR cases |

### Test coupons

Create these once at `/admin/coupons`:

| Code | Type | Value | Limits | Tests |
|---|---|---|---|---|
| `TESTPCT` | Percent | 10 | Max discount ₹50 | Normal percent path, cap |
| `TESTFIX` | Fixed | 100 | Min order ₹500 | Fixed path, minimum-order rejection |
| `TESTONCE` | Percent | 5 | Per-user limit 1 | Per-user cap, and cancel-restores-cap |
| `TESTFULL` | Percent | 100 | — | ⚠ Produces a ₹0 Razorpay order — see `KNOWN-ISSUES.md` |
| `TESTEXP` | Percent | 10 | Expires yesterday | Expiry rejection |

---

## 5. Ground rules for testing on production

- **Never run a `[LOCAL-ONLY]` case against `naamiofficial.in`.** Those include
  brute-force rate-limit probes, stock-exhaustion races and forged-payment replays.
- Prefer off-peak hours for anything tagged `[PROD-DATA]`.
- Prefix everything you create with `ZZ TEST` so it sorts to the bottom of admin
  lists and is obvious to anyone else looking.
- **Clean up as you go.** Soft deletes mean nothing is truly removable from the
  admin UI — an unpublished ZZ TEST product is the closest you get.
- Announce a test window if anyone else is working on the site. Several admin cases
  change site-wide design settings.

### Cleanup query

Run at the end of a session to see what you left behind:

```sql
SELECT id, name, is_published FROM products     WHERE name LIKE 'ZZ TEST%';
SELECT id, code                FROM coupons     WHERE code LIKE 'TEST%';
SELECT id, title               FROM blog_posts  WHERE title LIKE 'ZZ TEST%';
SELECT id, total_inr, status   FROM orders      WHERE total_inr <= 10 ORDER BY created_at DESC LIMIT 20;
```

---

## 6. Environment facts worth knowing before you start

These explain behaviour you will otherwise mistake for bugs.

- **Design settings and product lists are Redis-cached.** The Design Manager states
  a **5-minute TTL**. A storefront change may not appear immediately.
- **The journal index is ISR with `revalidate = 300`** — a newly published post can
  take five minutes to appear at `/journal`.
- **Rate limiting fails open.** If Upstash Redis is unreachable or over quota,
  every limiter silently stops enforcing (`src/lib/redis.ts:147`). A rate-limit
  case that "passes" may just mean Redis is down — check
  `/api/health/ready` first.
- **Reads may hit a replica.** Order search, feedback, blog and product sub-tables
  read `dbRead`. Under replication lag a just-written row can briefly be missing.
- **The cart lives in `localStorage` under `naami_cart` and survives sign-out.**
  Clear it in DevTools → Application when a case needs a clean cart.
- **Dates are inconsistent.** Coupon windows and order filters are IST-converted at
  the boundary; categories, blog, feedback and the analytics "Recent Orders" table
  use plain `en-IN` formatting with no timezone. Late-night testing will show
  off-by-one days in some tables and not others.
