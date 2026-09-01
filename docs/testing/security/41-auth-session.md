# 41 — Authentication & Session Security

**Area prefix:** `TC-SEC-AUTH`

---

## Cookie attributes

- [ ] **TC-SEC-AUTH-001** `[PROD-SAFE]` — The session cookie is `HttpOnly`
  - **Steps:** 1. Sign in 2. Console: `document.cookie`
  - **Expect:** `naami_session` is **absent** from the output. If it appears, any
    XSS becomes full account takeover — **S1**.
- [ ] **TC-SEC-AUTH-002** `[PROD-SAFE]` — The cookie is `Secure` on production
  - **Steps:** DevTools → Application → Cookies
  - **Expect:** the Secure column is ticked.
- [ ] **TC-SEC-AUTH-003** `[PROD-SAFE]` — `SameSite` is `Lax`
- [ ] **TC-SEC-AUTH-004** `[PROD-SAFE]` — `Path` is `/` and expiry is about 7 days
- [ ] **TC-SEC-AUTH-005** `[PROD-SAFE]` — The cookie is not sent over plain http
  - **Steps:** `curl -sI http://naamiofficial.in/`
  - **Expect:** a redirect to https before anything is transmitted.

---

## Token integrity

- [ ] **TC-SEC-AUTH-009** `[PROD-SAFE]` — A tampered payload is rejected
  - **Steps:** 1. Copy your session cookie 2. Base64-decode the middle segment
    3. Change `"role":"customer"` to `"role":"admin"` 4. Re-encode, reassemble with
    the original signature, and set it as the cookie 5. Load `/admin`
  - **Expect:** rejected — redirected to `/auth`. The signature no longer matches.
    **If you reach the admin panel, stop and report S1.**
- [ ] **TC-SEC-AUTH-010** `[PROD-SAFE]` — An `alg: none` token is rejected
  - **Steps:** 1. Build a JWT with header `{"alg":"none","typ":"JWT"}`, payload
    `{"email":"you@example.com","role":"super_admin"}`, and an empty signature
    2. Set it as the cookie 3. Request `/api/admin/products`
  - **Expect:** **401**. Both `jwtVerify` calls pin `algorithms: ['HS256']`.
- [ ] **TC-SEC-AUTH-011** `[PROD-SAFE]` — An RS256-signed token is rejected
  - **Steps:** sign a token with RS256 using any key and present it
  - **Expect:** **401** — algorithm confusion is blocked.
- [ ] **TC-SEC-AUTH-012** `[PROD-SAFE]` — A garbage cookie value is rejected
  - **Steps:** set `naami_session=aaa.bbb.ccc`
  - **Expect:** treated as signed out, no 500.
- [ ] **TC-SEC-AUTH-013** `[PROD-SAFE]` — An empty cookie is treated as signed out
- [ ] **TC-SEC-AUTH-014** `[LOCAL-ONLY]` — An expired token is rejected
  - **Steps:** mint a token with `exp` in the past using the local `JWT_SECRET`
  - **Expect:** **401**.

---

## Session revocation

- [ ] **TC-SEC-AUTH-018** `[PROD-DATA]` — Demotion revokes API access immediately
  - **See** `admin/20-access-roles.md` TC-ADM-ACC-032 for the full procedure.
  - **Expect:** **403** on the next admin API call, without signing out.
- [ ] **TC-SEC-AUTH-019** `[PROD-DATA]` — Soft-deleting a user revokes access immediately
  - **Expect:** **401**.
- [ ] **TC-SEC-AUTH-020** `[PROD-DATA]` — **A demoted admin still passes the page gate**
  - **Steps:** after demoting, load `/admin` in the same session
  - **Expect:** the shell may render because the edge proxy trusts the token claim.
    All data calls fail. Record what the user sees — this is defence-in-depth
    weakness rather than a breach, so **S3**.
- [ ] **TC-SEC-AUTH-021** `[PROD-SAFE]` — Signing out invalidates access for that browser
- [ ] **TC-SEC-AUTH-022** `[PROD-SAFE]` — **A signed-out cookie value still works if replayed**
  - **Steps:** 1. Copy your cookie value 2. Sign out 3. Set the copied value back
    4. Request `/api/orders`
  - **Expect:** it will likely **succeed** — sign-out only clears the browser
    cookie; there is no server-side session registry or token denylist.
  - **Record as S2.** It means a stolen token stays valid for its full 7 days
    regardless of what the user does.

---

## The password-reset takeover chain

⚠ **KNOWN** KI-004. This is the highest-severity finding in the application.

- [ ] **TC-SEC-AUTH-026** `[PROD-DATA]` — Reset requires no proof of prior ownership
  - **Steps:** 1. Sign out completely 2. Go to `/auth` → Forgot password
    3. Enter the address of a test account **whose password you do not type**
    4. Read the emailed code 5. Set a new password
  - **Expect:** you are signed in as that account with a new password. **No old
    password, no security question, no confirmation step.**
  - **Impact:** anyone with mailbox access — or who can intercept one email — owns
    the account.

- [ ] **TC-SEC-AUTH-027** `[LOCAL-ONLY]` — The same works against an **admin** account
  - **Steps:** repeat against your test `admin` account, locally
  - **Expect:** it succeeds and you gain admin. Confirms the blast radius.
  - **Cleanup:** restore the password.

- [ ] **TC-SEC-AUTH-028** `[PROD-SAFE]` — No notification is sent on password change
  - **Steps:** after a reset, check the account's mailbox
  - **Expect:** record whether any "your password was changed" email arrives. If
    not, a takeover is completely silent to the victim — worth calling out in the
    report.

- [ ] **TC-SEC-AUTH-029** `[PROD-SAFE]` — Check whether `SUPER_ADMIN_EMAIL`'s account exists
  ```sql
  SELECT email, role FROM users WHERE role = 'super_admin';
  ```
  - **Expect:** it exists. **If the address configured in `SUPER_ADMIN_EMAIL` has no
    account yet, anyone who controls that mailbox can sign up and become
    super_admin.** Report S1 if so, and create the account immediately.

---

## Account enumeration

- [ ] **TC-SEC-AUTH-033** `[PROD-SAFE]` — Login does not distinguish unknown from wrong password
  - **Steps:** 1. Wrong password on a known account 2. Any password on an unknown
    address 3. Compare responses byte for byte
  - **Expect:** identical `{"error":"Incorrect email or password."}` and the same
    status.

- [ ] **TC-SEC-AUTH-034** `[PROD-SAFE]` — **Signup DOES reveal whether an address is registered**
  - **Steps:** 1. Sign up with a known address 2. Sign up with an unknown one
  - **Expect:** the known one returns **409 `EMAIL_TAKEN`**; the unknown returns
    success. This is a deliberate usability trade-off — record it as **S3** so it is
    an explicit decision. It is limited by the 5-per-10-minute send-OTP limit, which
    caps enumeration to 5 addresses per IP per window.

- [ ] **TC-SEC-AUTH-035** `[PROD-SAFE]` — Password reset does **not** enumerate
  - **Steps:** request a reset for an unknown address
  - **Expect:** the same OTP screen and `{"success":true}` as for a real account,
    with no email actually sent.

- [ ] **TC-SEC-AUTH-036** `[LOCAL-ONLY]` — Login timing does not reliably reveal accounts
  - **Steps:** 1. Time 30 logins against a known account with a wrong password
    2. Time 30 against unknown addresses 3. Compare the medians
  - **Expect:** a measurable difference is likely, because the password hash
    comparison short-circuits when there is no stored hash. Record the delta —
    report **S3** if it is consistently large enough to be usable.

---

## OTP security

- [ ] **TC-SEC-AUTH-040** `[PROD-DATA]` — Only 3 wrong attempts are allowed
  - **Expect:** after the third, the code is deleted and even the correct code
    fails.
- [ ] **TC-SEC-AUTH-041** `[PROD-DATA]` — Codes expire after 10 minutes
- [ ] **TC-SEC-AUTH-042** `[PROD-DATA]` — A used code cannot be reused
- [ ] **TC-SEC-AUTH-043** `[LOCAL-ONLY]` — Codes are not guessable at scale
  - **Steps:** 1. Request a code 2. Script 1000 wrong guesses
  - **Expect:** blocked after 3 by the per-OTP counter, and after 10 requests per
    5 minutes by the rate limiter — **but see `45-rate-limits.md` TC-SEC-RL-002**,
    because that limiter is bypassable. Combined, the per-OTP counter is the real
    control. Confirm it holds.
- [ ] **TC-SEC-AUTH-044** `[PROD-SAFE]` — Codes are 6 digits from a secure source
  - **Steps:** request 10 codes and check for obvious patterns
  - **Expect:** no sequences or repeats.

---

## CSRF

⚠ **KNOWN** KI-017 — there is no CSRF token anywhere.

- [ ] **TC-SEC-AUTH-048** `[LOCAL-ONLY]` — A cross-origin POST is blocked by SameSite
  - **Steps:** 1. On a different origin, run:
    ```html
    <form action="https://naamiofficial.in/api/auth/signout" method="POST">
      <input type="submit">
    </form>
    ```
    2. Submit it while signed in on another tab
  - **Expect:** the cookie is **not** sent (SameSite=Lax withholds it on cross-site
    POST), so no session is affected. Confirm that is what happens.
- [ ] **TC-SEC-AUTH-049** `[LOCAL-ONLY]` — A cross-origin `fetch` cannot mutate state
  - **Steps:** from another origin:
    ```js
    fetch('https://naamiofficial.in/api/wishlist', {
      method: 'POST', credentials: 'include',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({productId: 1})
    })
    ```
  - **Expect:** blocked by CORS and/or no cookie sent. Verify **nothing was added**
    to the wishlist.
- [ ] **TC-SEC-AUTH-050** `[PROD-SAFE]` — `POST /api/auth/signout` requires no session
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/auth/signout"
  ```
  **Expect:** **200** with no cookie at all. Harmless in isolation, but confirm it
  as part of the CSRF picture — S3.
- [ ] **TC-SEC-AUTH-051** `[PROD-SAFE]` — There is no GET-based logout
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/auth/signout"
  ```
  **Expect:** **405** or 404 — a GET logout would be triggerable by an `<img>` tag.

---

## Redirect safety

- [ ] **TC-SEC-AUTH-055** `[PROD-SAFE]` — `?from=//evil.com` cannot redirect off-site
  - **See** `customer/08-auth.md` TC-AUTH-012. **Any off-site redirect is S1.**
- [ ] **TC-SEC-AUTH-056** `[PROD-SAFE]` — `?from=https://evil.com` is ignored
- [ ] **TC-SEC-AUTH-057** `[PROD-SAFE]` — `?from=/\evil.com` is ignored
- [ ] **TC-SEC-AUTH-058** `[PROD-SAFE]` — `?from=%2F%2Fevil.com` (encoded) is ignored
- [ ] **TC-SEC-AUTH-059** `[PROD-SAFE]` — `?from=javascript:alert(1)` is ignored

---

## Password storage

- [ ] **TC-SEC-AUTH-063** `[PROD-SAFE]` — Passwords are hashed, not stored plainly
  ```sql
  SELECT email, left(password_hash, 20) FROM users LIMIT 3;
  ```
  **Expect:** an opaque hash, not readable text. **Plaintext is S1.**
- [ ] **TC-SEC-AUTH-064** `[PROD-SAFE]` — Two accounts with the same password have different hashes
  - **Expect:** different — confirming a per-user salt.
- [ ] **TC-SEC-AUTH-065** `[PROD-SAFE]` — Passwords never appear in logs
  ```bash
  pm2 logs naami --lines 500 --nostream | grep -i -E 'password|passwordHash' | head
  ```
  **Expect:** no password values. **Any leak is S1.**
- [ ] **TC-SEC-AUTH-066** `[PROD-SAFE]` — The minimum length is 8 and there is no complexity rule
  - **Expect:** confirm and record. Consider whether 8 characters with no other
    requirement is acceptable given the reset weakness above.
