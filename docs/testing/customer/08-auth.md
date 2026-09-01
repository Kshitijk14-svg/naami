# 08 — Authentication

`/auth` · `src/components/AuthForm.tsx`

Three modes (`signin` / `signup` / `reset`) × three steps (`form` / `otp` /
`success`). OTP is the only way to create an account or reset a password — there is
no password-only signup.

**All forms carry `noValidate`**, so browser validation is off. The only client
gate is the disabled submit button.

**Area prefix:** `TC-AUTH`

---

## Page shell

- [ ] **TC-AUTH-001** `[PROD-SAFE]` — `/auth` has no navbar, no announcement bar and no footer
  - **Expect:** only its own "naami" wordmark, which links to `/`.
- [ ] **TC-AUTH-002** `[PROD-SAFE]` — Signed in, `/auth` redirects by role
  - **Steps:** 1. Sign in as a customer 2. Navigate to `/auth`
  - **Expect:** redirected to `/`. As staff/admin/super_admin: redirected to
    `/admin`.
- [ ] **TC-AUTH-003** `[PROD-SAFE]` — Sign In / Create Account tabs render on the form step
  - **Expect:** both tabs visible in signin and signup, **absent** in reset mode and
    absent on the OTP step.
- [ ] **TC-AUTH-004** `[PROD-SAFE]` — Switching modes keeps email and name, clears passwords
  - **Steps:** 1. In signup, fill email, name and password 2. Switch to Sign In
    3. Switch back
  - **Expect:** email and name survive; password and confirm are cleared.
- [ ] **TC-AUTH-005** `[PROD-SAFE]` — No password-visibility toggle in any mode
  - **Expect:** confirm absence. Record as S3.
- [ ] **TC-AUTH-006** `[PROD-SAFE]` — No "remember me", no social login, no CAPTCHA

---

## `?from=` redirect

- [ ] **TC-AUTH-010** `[PROD-SAFE]` — `?from=/profile` returns you there after sign-in
- [ ] **TC-AUTH-011** `[PROD-SAFE]` — `?from=/cart` returns you to the cart
- [ ] **TC-AUTH-012** `[PROD-SAFE]` — `?from=//evil.com` is **ignored**
  - **Steps:** 1. Load `/auth?from=//evil.com` 2. Sign in
  - **Expect:** you land on `/` (or `/admin` by role) — **never** an external site.
    **If you end up off-site, stop and report S1 immediately.**
- [ ] **TC-AUTH-013** `[PROD-SAFE]` — `?from=https://evil.com` is ignored
- [ ] **TC-AUTH-014** `[PROD-SAFE]` — `?from=` (empty) falls back to the role default
- [ ] **TC-AUTH-015** `[PROD-SAFE]` — Visiting `/profile` signed out sets `?from=/profile`
  - **Steps:** 1. Sign out 2. Navigate to `/profile` 3. Read the URL
- [ ] **TC-AUTH-016** `[PROD-SAFE]` — Same for `/orders/{id}` and `/admin`

---

## Sign in

- [ ] **TC-AUTH-020** `[PROD-SAFE]` — Submit is disabled until both fields are non-empty
- [ ] **TC-AUTH-021** `[PROD-DATA]` — Correct credentials sign you in
  - **Expect:** the button reads "Signing In…", then a green success block, then a
    redirect after roughly 700ms.
- [ ] **TC-AUTH-022** `[PROD-SAFE]` — A wrong password shows **"Incorrect email or password."**
- [ ] **TC-AUTH-023** `[PROD-SAFE]` — An unknown email shows the **same** message
  - **Expect:** byte-identical to the wrong-password message. Any difference is an
    account-enumeration oracle — report S2.
- [ ] **TC-AUTH-024** `[PROD-SAFE]` — A malformed email shows "Email and password are required."
  - **Steps:** 1. Enter `notanemail` and any password
  - **Note:** there is no client-side email check on sign-in, so this round-trips to
    the server.
- [ ] **TC-AUTH-025** `[LOCAL-ONLY]` — More than 10 attempts in 5 minutes is throttled
  - **Expect:** "Too many attempts. Please wait a moment and try again."
  - **See also** `security/45-rate-limits.md` TC-SEC-RL-002 — this limiter is
    bypassable (KI-001).
- [ ] **TC-AUTH-026** `[PROD-SAFE]` — "Create account" switches to signup
- [ ] **TC-AUTH-027** `[PROD-SAFE]` — "Forgot password?" switches to reset
- [ ] **TC-AUTH-028** `[LOCAL-ONLY]` — A network failure shows "Network error. Please try again."

---

## Create account

- [ ] **TC-AUTH-032** `[PROD-SAFE]` — Submit is disabled until all four fields are filled
- [ ] **TC-AUTH-033** `[PROD-SAFE]` — A short password → "Password must be at least 8 characters."
  - **Try:** 7 chars fails, 8 chars passes.
- [ ] **TC-AUTH-034** `[PROD-SAFE]` — Mismatched passwords → "Passwords do not match."
- [ ] **TC-AUTH-035** `[PROD-SAFE]` — There is no password complexity rule beyond length
  - **Steps:** 1. Use `password` as the password
  - **Expect:** accepted. Record as S3 if you want complexity.
- [ ] **TC-AUTH-036** `[PROD-SAFE]` — An existing email switches you to sign-in
  - **Steps:** 1. Sign up with an address that already has an account
  - **Expect:** the mode flips to Sign In with **"This email is already registered —
    please sign in."** and the email preserved.
  - **Note:** this is a deliberate enumeration oracle. See
    `security/41-auth-session.md`.
- [ ] **TC-AUTH-037** `[PROD-SAFE]` — A malformed email → "Invalid email address."
  - **Note:** there is no client-side format check here either.
- [ ] **TC-AUTH-038** `[PROD-DATA]` — A valid signup sends a code and moves to the OTP step
- [ ] **TC-AUTH-039** `[LOCAL-ONLY]` — More than 5 sends in 10 minutes is throttled
- [ ] **TC-AUTH-040** `[LOCAL-ONLY]` — Unconfigured mail shows "Mail server configuration missing."
  - **Pre:** `GMAIL_USER` or `GMAIL_PASS` unset
  - **Note:** if this reproduces on production, **nobody can sign up or log in** —
    S1.

---

## Password reset

- [ ] **TC-AUTH-044** `[PROD-SAFE]` — Only an email field is shown
- [ ] **TC-AUTH-045** `[PROD-DATA]` — A known address sends a code and shows the OTP step
- [ ] **TC-AUTH-046** `[PROD-SAFE]` — An **unknown** address also shows the OTP step
  - **Expect:** identical UI and the copy *"If an account exists for {email}…"* —
    non-enumerating by design. No email is actually sent.
- [ ] **TC-AUTH-047** `[PROD-DATA]` — The OTP step shows two new-password fields
- [ ] **TC-AUTH-048** `[PROD-DATA]` — A valid code + new password signs you in
  - **Expect:** the success block, then a redirect. Confirm the **old** password no
    longer works.
- [ ] **TC-AUTH-049** `[PROD-SAFE]` — "← Back to sign in" returns to the form
- [ ] **TC-AUTH-050** `[PROD-DATA]` — Resetting does **not** require the old password
  - **Expect:** confirm. See `security/41-auth-session.md` TC-SEC-AUTH-014 —
    ⚠ **KNOWN** KI-004, this is a full account-takeover path.

---

## OTP entry

Shared by signup and reset.

- [ ] **TC-AUTH-054** `[PROD-DATA]` — The field autofocuses on arrival
- [ ] **TC-AUTH-055** `[PROD-DATA]` — Only digits are accepted
  - **Steps:** 1. Type `abc123`
  - **Expect:** the field shows `123` — letters are stripped as you type.
- [ ] **TC-AUTH-056** `[PROD-DATA]` — Input is capped at 6 characters
- [ ] **TC-AUTH-057** `[PROD-DATA]` — Pasting `12-34-56` yields `123456`
- [ ] **TC-AUTH-058** `[PROD-DATA]` — Submit stays disabled below 6 digits
- [ ] **TC-AUTH-059** `[PROD-DATA]` — The correct code completes the flow
- [ ] **TC-AUTH-060** `[PROD-DATA]` — A wrong code counts down remaining attempts
  - **Steps:** 1. Enter a wrong code three times, reading the message each time
  - **Expect:** `Incorrect code. 2 attempts remaining.` → `1 attempt remaining.`
    (singular) → then **"Too many incorrect attempts. Please request a new code."**
  - **Then:** the OTP is deleted — the correct code no longer works either.
- [ ] **TC-AUTH-061** `[PROD-DATA]` — A code for an address that never requested one
  - **Expect:** "No code found for this email. Please request a new one."
- [ ] **TC-AUTH-062** `[PROD-DATA]` — An expired code is rejected
  - **Steps:** 1. Request a code 2. Wait **more than 10 minutes** 3. Enter it
  - **Expect:** "Code has expired. Please request a new one."
- [ ] **TC-AUTH-063** `[PROD-DATA]` — A used code cannot be reused
- [ ] **TC-AUTH-064** `[PROD-DATA]` — Resend is disabled for 60 seconds
  - **Expect:** the label counts down "Resend in 59s"… then becomes "Resend code".
- [ ] **TC-AUTH-065** `[PROD-DATA]` — Resend issues a new working code
  - **Expect:** the new code works. Check whether the **old** one still works too —
    record either way.
- [ ] **TC-AUTH-066** `[LOCAL-ONLY]` — A failed resend still locks the button 60s
  - **Steps:** 1. Block `/api/auth/send-otp` 2. Click Resend
  - **Expect:** an error shows **and** the cooldown starts anyway — you cannot retry
    for a minute. Record as S3.
- [ ] **TC-AUTH-067** `[PROD-DATA]` — There is no "wrong email?" affordance
  - **Expect:** confirm absence. The only way out is "← Back to sign in" and
    starting over. Record as S3.
- [ ] **TC-AUTH-068** `[PROD-DATA]` — Leaving the OTP step does not invalidate the code
  - **Steps:** 1. Request a code 2. Click "← Back to sign in" 3. Start signup again
    with the same email 4. Enter the **first** code
  - **Expect:** record whether it still works. It likely does — the client
    abandoning the flow does not clear the server-side OTP.

---

## Session

- [ ] **TC-AUTH-072** `[PROD-SAFE]` — The session cookie has the right attributes
  - **Steps:** 1. Sign in 2. DevTools → Application → Cookies → `naami_session`
  - **Expect:** `HttpOnly` ✅, `Secure` ✅ (on https), `SameSite=Lax`, `Path=/`,
    expiry ~7 days.
- [ ] **TC-AUTH-073** `[PROD-SAFE]` — The cookie is not readable from JavaScript
  - **Steps:** 1. Console: `document.cookie`
  - **Expect:** `naami_session` is **absent**. If visible, S1.
- [ ] **TC-AUTH-074** `[PROD-SAFE]` — Sign-out clears the cookie
- [ ] **TC-AUTH-075** `[PROD-SAFE]` — Sign-out does **not** clear the cart
  - **See** `06-cart.md` TC-CART-003.
- [ ] **TC-AUTH-076** `[PROD-DATA]` — Signing in on a second device does not sign out the first
  - **Expect:** both sessions remain valid. There is no session registry.
- [ ] **TC-AUTH-077** `[PROD-SAFE]` — A tampered cookie is rejected
  - **Steps:** 1. Edit one character of the cookie value 2. Reload `/profile`
  - **Expect:** treated as signed out, redirected to `/auth`.

---

## Success block

- [ ] **TC-AUTH-081** `[PROD-DATA]` — Copy matches the mode
  - **Expect:** "Account created" / "Password updated" / "Signed in", plus
    "Redirecting…".
- [ ] **TC-AUTH-082** `[PROD-DATA]` — On the OTP step, the form and success block both show
  - **Steps:** 1. Complete an OTP verification and watch the moment of success
  - **Expect:** the OTP fields remain visible but disabled beneath the success card.
    Take a screenshot — record as S4 if it looks wrong.
