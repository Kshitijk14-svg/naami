# NAAMI — Security, Functionality & API Audit

**Date:** 23 September 2026
**Scope:** Full application — storefront, admin dashboard, and all 50+ API route handlers
**Method:** Static source audit. Every finding below was reproduced by reading the code and
executing the relevant logic in isolation. No runtime or penetration testing was performed (the
local Postgres was not running), so the deployment-configuration items in §5 are for you to confirm
on the VPS.
**Stack audited:** Next.js 16 (App Router), React 19, Drizzle/PostgreSQL, Razorpay, email-OTP auth,
Upstash Redis, nginx on an OVH VPS.

---

## 1. Executive summary

**The two things you were most concerned about are sound.**

- **Admin dashboard breach — none found.** All 21 admin route files guard 100% of their 39 exported
  handlers, and the dashboard sits behind three independent gates (edge proxy → server layout →
  client shell), with privileged roles re-read from the database on every single request.
- **Payment integrity — no finding.** The checkout flow does not trust the browser anywhere that
  matters. Prices are recomputed server-side, order contents come from a stored intent rather than
  the request body, and every payment is re-verified directly against the Razorpay API for amount,
  currency and capture status. Replaying a valid signature with a swapped cart buys nothing.

What I did find falls into one recurring pattern: **a correct security control was built, applied at
one call site, and never propagated to its siblings.** The hardened IP resolver was applied to five
routes and missed the two most brute-forceable ones. The HTML escaper is used in one of five email
templates. The `adminNotes` filter is on the single-order endpoint but not the list endpoint. That
is a good sign about the codebase — the right controls already exist — but each gap was real.

**13 issues were found and fixed.** Four were serious enough to matter commercially on day one.

| # | Issue | Severity |
|---|---|---|
| S1 | Login and OTP brute-force throttling could be bypassed with a spoofed header | **High** |
| S9 | Every logged error was silently discarded — including all payment failures | **High** |
| W1 | A network blip after payment left charged customers on a spinner forever | **High** |
| W2 | A failed load in the Design Manager, then Save, would blank live CMS content | **High** |
| S2 | Login response time revealed whether an email was registered | Medium |
| S3 | A crafted link could redirect users off-site immediately after login | Medium |
| S4 | Order emails and the tracking link were not escaped or validated | Medium |
| S5 | Internal staff notes were sent to the customer they were written about | Medium |
| S6 | The video route loaded whole files into memory on every request | Medium |
| W3 | The wishlist heart silently lied after a session expired | Medium |
| W4 | Out-of-stock items could be added to the cart from the collection page | Medium |
| W5 | Admin forms hung forever and deletes failed silently on any error | Medium |
| S7/S8/W6/W7 | Missing rate limits, unvalidated ids, dead code, keyboard access | Low |

Nothing found suggests the site has been compromised. These are pre-launch defects, not incident
indicators.

---

## 2. Security findings (fixed)

### S1 — Brute-force throttling could be bypassed · **HIGH**

`src/lib/requestIp.ts` exists specifically to stop a client choosing its own rate-limit bucket. Its
own header comment names the controls that were broken: *"login throttling, OTP send/verify
limits"*. That fix reached five call sites but missed the two that matter most:

- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/verify-otp/route.ts`

Both still read the **first** entry of `X-Forwarded-For`. Your nginx config uses
`proxy_add_x_forwarded_for` (`deploy/nginx.conf:81,94`), which *appends* the real visitor to the
header rather than replacing it — so that first entry is a string the attacker supplies. By sending
a different value on each request, an attacker got a fresh "10 attempts per 5 minutes" allowance
every time: **unlimited password guessing and unlimited OTP guessing.**

**Fixed.** Both now use `rateLimitKey()`, which reads `X-Real-IP` — nginx sets this to the true peer
address, which cannot be forged past the proxy. Verified: a search of the whole source tree for raw
`x-forwarded-for` reads now returns only `requestIp.ts` itself.

### S2 — Login revealed which email addresses are registered · **MEDIUM**

The login route returns a deliberately generic *"Incorrect email or password."*, and its comment
claimed the password hash comparison ran even for unknown accounts to keep timing uniform. It did
not — `verifyPassword()` returned immediately when no hash was supplied. Measured on this machine,
the configured scrypt work factor costs **~95 ms**, so a registered email answered ~95 ms slower
than an unregistered one. That is trivially measurable over a network and enough to enumerate your
customer list, regardless of what the error message said.

**Fixed.** Unknown accounts are now verified against a fixed dummy hash so both paths pay the same
cost. The misleading comment was corrected.

### S3 — Open redirect via a crafted sign-in link (link tampering) · **MEDIUM**

The post-login redirect honoured a `?from=` parameter, guarded by checking that the value started
with `/` but not `//`. A leading backslash defeats this. Verified with the standard URL parser:

| `?from=` value | passed the old guard | resolved to |
|---|---|---|
| `/\evil.com` | **yes** | `https://evil.com/` |
| `//evil.com` | no | — |

So `https://naami.in/auth?from=/\evil.com` sent the user to an attacker's site **the instant their
login succeeded** — the exact moment someone is least likely to question where they landed, and a
clean setup for credential phishing on a lookalike page.

**Fixed.** The destination is now resolved against the site's own origin and the origins compared,
rather than pattern-matching the string. Re-verified against nine bypass variants (`/\`, `//`,
`////`, absolute URLs, `javascript:`, embedded tabs) — none escape the origin.

### S4 — Order emails and tracking links were unescaped · **MEDIUM**

`src/lib/email.ts` contains a correct `escapeHtml()` helper. It was called in exactly one of five
senders. The order confirmation, status update, invoice and abandoned-cart templates all
interpolated names, addresses, product names and tracking details straight into HTML.

The sharp edge was `trackingUrl`. The admin API wrote it with **no validation at all**, and it
reached two places:

1. Into `<a href="...">` inside the shipment email your customer receives from your domain — a
   quote character breaks out of the attribute into arbitrary HTML.
2. Into `<a href={...}>` on the customer's own order page. React does **not** block `javascript:`
   URLs, so this was a stored cross-site-scripting vector in a customer's session, reachable by any
   `staff`-level account.

**Fixed.** Every interpolated value in all five templates is now escaped, and hrefs additionally go
through a `safeHref()` that permits only `http(s)`. The admin API now rejects a non-http(s)
`trackingUrl` with a clear 400, and the customer order page independently refuses to render one — so
rows already in your database with a bad value are covered too.

### S5 — Internal staff notes were sent to customers · **MEDIUM**

`GET /api/orders` returned whole database rows, including `adminNotes` — the internal field where
staff record fraud flags, refund reasoning and notes about the customer. Any signed-in customer
could read the notes written about them by opening their browser's network tab.

The sibling single-order endpoint strips exactly this field and documents why; the list endpoint was
missed. Rows were correctly scoped to the requesting customer, so this was never cross-customer
exposure.

**Fixed.** The list endpoint now applies the same omission.

### S6 — Video route loaded whole files into memory · **MEDIUM**

The video serving route read the entire file into memory before slicing it, *including* for range
requests. With a 60 MB upload cap, an unauthenticated and unthrottled endpoint, and browsers issuing
several range requests per video, a handful of concurrent viewers could put real memory pressure on
the VPS.

**Fixed.** It now streams only the requested byte window off disk.

### S7 / S8 — Rate limits and input hardening · **LOW**

- **Rate limits added** to the four most expensive endpoints, all previously unthrottled: image
  upload (sharp re-encode), video upload (ffmpeg transcode), invoice download (generates a PDF per
  call), and product search (an uncached database scan per unique term, reachable anonymously).
  Search now also caps query length, which bounds Redis cache-key growth.
- **Video upload extension allow-listed.** The uploader previously took the file extension from the
  uploaded filename, so `clip.html` was stored as `clip-<hash>.html`. **This was not exploitable** —
  the only route that serves those files allow-lists `.mp4/.webm/.mov`, and nginx proxies everything
  to the app rather than serving from disk — but writing an arbitrary extension is a foothold
  waiting for the day someone adds a static location block. Now restricted at upload time.
- **18 numeric-id guards added** across the admin and wishlist routes. A non-numeric URL segment
  previously became `NaN` and reached the database, surfacing as a 500 instead of a clean 400.
- **Order ownership check made fail-safe.** The three per-order endpoints were correct, but were
  written as *"if the role is `customer`, check ownership"* — protecting by naming the one role that
  must be restricted. Adding any future role to the allow-list would have silently granted it every
  order in the database. They now check against an explicit list of roles permitted cross-order
  access, so anything unrecognised defaults to restricted.

---

## 3. Operational finding (fixed)

### S9 — Every logged error was discarded · **HIGH**

Not a vulnerability, but on a site taking live money this was the most expensive defect in the
report.

The logger applied its redaction pass to the context object *before* the JSON serializer's
error-handling ran. Because `message` and `stack` are non-enumerable properties on a JavaScript
`Error`, the redaction pass rebuilt every error as an empty object — and the serializer that would
have rescued it never saw an `Error` at all. Reproduced exactly:

```
after redaction = {"err":{}}
```

The result: all ~30 error log sites across the app emitted `"err":{}`. That included **every payment
failure path** — gateway unreachable, order creation failed after money was captured, webhook
handler crashed. When a real customer's payment broke, your logs recorded *that* it broke and
nothing whatsoever about *why*.

**Fixed.** Errors are now unwrapped before the generic walk, preserving name, message, stack and
`cause`. Verified by running the real logger: the message and stack now appear, and secret redaction
still works — `password`, `otp` and the rest are still `[redacted]`, including when nested.

---

## 4. Functional findings (fixed)

### W1 — Charged customers could be stranded on a spinner · **HIGH**

In the checkout page, the call that confirms payment with your server sat **outside** its own
`try`/`catch`. Because it runs inside the Razorpay callback, the page's outer error handling did not
cover it either.

If the network dropped between "payment captured" and that confirmation call — the common case on
mobile, right after returning from a UPI or banking app — the failure went unhandled. The reassuring
message the code was written to show ("Payment received, but we could not load your order page…")
**never rendered**, the spinner never stopped, and a customer who had just been charged was left
staring at "Processing…" with no idea whether their money was gone.

Their order was always safe — the Razorpay webhook creates it independently — but they had no way to
know that, which is exactly when support tickets and chargebacks happen.

**Fixed.** The call is now inside the `try`, so the intended message appears and the button resets.

### W2 — The Design Manager could wipe your live content · **HIGH**

The Design Manager loaded four endpoints with no response-status checks and an empty catch. If any
of them failed — a brief network drop, or simply a session that expired while the tab was open — the
page rendered **empty form fields with no error message at all**, looking exactly like genuinely
empty content. Every Save path then wrote `settings[key] ?? ""`, and the API accepts empty strings.

One click of Save after a silent load failure would blank every field in that section of your live
site.

**Fixed.** A failed load is now reported explicitly, and the editor is hidden entirely behind a
"Could not load settings" panel with a Retry button — so there is no form to save and no way to
overwrite good content with blanks.

### W3 — The wishlist heart lied after a session expired · **MEDIUM**

The wishlist store caught every error and did nothing on a failed response — no revert, no rethrow.
The heart filled in optimistically, the server stored nothing, and the "send them to sign in"
handler in the button could never fire because nothing ever threw. Separately, the button treated
"the initial load hasn't come back yet" as "you're logged out" and ejected signed-in users to the
sign-in page for clicking too quickly on a freshly loaded page. Removing an item from the Profile
page also didn't check the response and didn't update the shared store, so the heart on the product
page stayed filled until a hard reload.

**Fixed.** The store now rolls back and reports failures, distinguishing a genuine 401 from a
network blip; the button only redirects on a real 401; the profile page checks the response, shows
an error, and keeps the shared store in step. Signing out now also clears the wishlist, so a second
person using the same browser no longer inherits the previous user's saved items.

### W4 — Out-of-stock items could be added from the collection page · **MEDIUM**

There are three add-to-cart implementations and they disagreed. The collection page's quick-view
never checked the product-level availability flag at all. For a stock-tracked product with zero
stock and no size rows, every other guard was skipped and the item went into the cart. The button
was never disabled and never said "Out of Stock" — so the shopper only discovered the problem at the
Pay button, where the server correctly refuses it.

**Fixed.** The availability check, the disabled state and the "Out of Stock" label now match the
home carousel's behaviour.

### W5 — Admin UI broke on any non-2xx response · **MEDIUM**

Several related defects, all fixed:

- **Forms hung forever.** Six admin submit handlers had no error handling, so a network failure
  skipped the "finished submitting" reset and left the Save button permanently disabled at
  "Saving…". Now wrapped in `try`/`finally`.
- **Errors were suppressed.** Seven error paths parsed the response body without a fallback, so a
  non-JSON 500 or 502 threw and the error message never appeared at all. Now guarded.
- **Deletes failed silently.** Five delete handlers ignored the response entirely, so a foreign-key
  rejection ("this category still has products") looked identical to a successful delete. Two of
  these sat inside save loops that went on to report "Saved ✓". All now report failure.
- **List pages crashed on session expiry.** Every admin list parsed the response as data without
  checking the status, so a 401 produced an error *object* where an array was expected and the table
  threw, blanking the screen with no explanation. All seven now route the failure into the error
  message they already knew how to display, and say "Your session has expired. Please sign in
  again." rather than a generic failure.
- **Sign-out ignored its response**, showing "signed out" while the session cookie was still live.
  Now verified before the UI tears down.

### W6 / W7 — Smaller functional and accessibility items · **LOW**

- **Search** silently showed nothing on failure (the dropdown never opened). It now reports the
  error. **Enter now runs the search** — the input isn't in a form and had no key handler, so
  previously Enter did nothing at all. Escape closes it.
- **Dead code removed:** three components never imported anywhere (`ProductGrid`,
  `PageTransitionWrapper`, `TwinBeadCursor`), plus four cart-store compatibility shims.
  `ProductGrid` contained an "Add to Wardrobe" button wired to an explicit no-op and hardcoded
  `$360` USD demo products — worth deleting before anyone wires it into a page by mistake.
- **Keyboard access:** the footer accordion and the collection product cards took keyboard focus but
  did nothing on Enter or Space, making footer links and the whole collection grid unreachable
  without a mouse. Both now respond correctly.
- **Checkout autofill:** the eight address fields had no `name` or `autocomplete` attributes, so
  browser and password-manager address autofill could not fire. Now annotated.
- **Checkout sign-in:** a logged-out shopper filled in the entire address form before being told to
  sign in, with no link and no way back. The error now includes a "Sign in →" link that returns them
  to checkout.
- **OTP resend** started its 60-second cooldown before the request was sent, so a failed resend
  locked the button for a minute having sent nothing. Now starts only on success.
- **Feedback** was in the admin sidebar but had no dashboard tile. Added.

---

## 5. Deployment configuration — for you to verify on the VPS

These are **not** code issues and I could not check them: the `.env.local` in this repository
contains only placeholders, which is correct. Confirmed separately: no environment file has ever
been committed to git. Each item below is silent when wrong, which is what makes it worth checking.

| Setting | Consequence if missing or wrong | Priority |
|---|---|---|
| `RAZORPAY_WEBHOOK_SECRET` | Webhooks return 503 and **orders are lost** whenever a customer closes the tab before the confirmation call completes. The webhook is the safety net for W1 above. Not present in `.env.local`. | **Critical** |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | **Every rate limit in the application silently becomes a no-op** — login, OTP, coupon, contact and checkout, all at once. See the note below. | **Critical** |
| `ENCRYPTION_KEY` | Customer phone numbers and shipping addresses are stored in PostgreSQL as **plain text**. Commented out in `.env.local`. Note the encryption is partial by design — shipping name and email are never encrypted. | **High** |
| `JWT_SECRET` | The app refuses to start (fails closed, which is correct). Must be long and random. | High |
| CSP is **Report-Only** | `deploy/nginx.conf:58` ships the Content-Security-Policy in report-only mode, so it currently blocks nothing. The comment says to switch it on after a clean test purchase — please make that a launch checklist item rather than an indefinite state. | Medium |
| No nginx `limit_req` | All throttling is application-level. Consider a `limit_req` on `/api/auth/` as a floor that keeps working even when Redis does not. | Medium |
| `TRUSTED_PROXY_HOPS` | Defaults to 1, which is right for nginx alone. Raise it only if you put a CDN or load balancer in front. | Low |

**On rate limits failing open.** By deliberate design, `checkRateLimit()` *allows* the request
whenever Redis is unconfigured, over quota, or its circuit breaker has tripped. That is a reasonable
availability trade-off, but it means brute-force protection is entirely contingent on Redis being
healthy — and an attacker who can trip the circuit breaker turns every limit off at once. This is
the strongest argument for the nginx `limit_req` floor above.

One related detail: OTP attempt counters increment in Redis only while Redis is up, while the
PostgreSQL fallback row stays at zero. If a Redis key is evicted mid-flow, the three-attempt lock
resets. The per-IP limit — now unspoofable, per S1 — is the backstop.

**Residual risk worth writing down:** sessions are stateless 7-day JWTs with no revocation list, and
signing out only clears the cookie. A stolen customer token stays valid until it expires. Privileged
accounts are protected by the per-request database re-read, so this applies to customers only.
Acceptable at this scale, but it should be a known and accepted position rather than a surprise.

---

## 6. Verified sound — no action needed

Recorded so you know what was checked and cleared, and so nobody "fixes" a control that is already
correct.

**Payments**

- The checkout signature is treated only as a cheap first gate. The authoritative check re-reads the
  payment from the Razorpay API and pins the gateway order id, currency and exact amount, captures
  the payment if it was merely authorised, then re-asserts the amount after capture.
- Order contents — items, prices, discount, shipping — come from a checkout intent stored *before*
  payment, never from the request body. Paying for one cart and receiving another is not possible.
- The cart is re-priced from database rows; client-sent prices are discarded. The receipt email is
  forced to the session's own address, closing an earlier hole that allowed sending mail to
  arbitrary addresses from your domain.
- The webhook verifies an HMAC over the raw request bytes, fails closed when its secret is missing,
  and returns a non-2xx on failure so Razorpay retries. nginx correctly exempts it from buffering.
- Idempotency keys are reserved *before* the handler runs, and only successful results are stored.

**Authentication and access control**

- All 21 admin route files guard all 39 handlers; all 46 guard call sites use the correct idiom.
- Three independent admin gates, and privileged roles are re-read from the database on every request
  — so revoking a staff member's access takes effect immediately rather than whenever their
  week-old token happens to expire.
- The JWT algorithm is pinned to HS256 (no algorithm-confusion attack), and a missing signing key
  throws rather than silently verifying everything against an empty string.
- Passwords use scrypt at N=32768 — comfortably above the OWASP minimum — with constant-time
  comparison.
- CSRF: `SameSite=Lax` plus `httpOnly` cookies, and I confirmed by scanning every route handler that
  no `GET` endpoint performs a write, which is the gap that configuration would otherwise leave.

**Data exposure**

- Public product endpoints use an explicit column allow-list that drops stock levels, publish flags
  and internal timestamps, collapsing stock to a simple boolean. The admin formatter is fenced off
  with a comment and never reaches a public route — I traced every caller.
- The cart-availability endpoint filters on published status, so unreleased stock cannot be
  enumerated by guessing ids.
- Password hashes never reach any response. Nothing sensitive is exposed via `NEXT_PUBLIC_` — only
  the Razorpay *key id*, which is public by design.
- No stack traces or raw exception messages reach clients.
- Path traversal on the image route is correctly blocked, with SVG deliberately excluded to prevent
  a self-XSS vector.
- All database queries are parameterised through Drizzle — no SQL injection surface found, including
  in the search query.

**Code health**

- No `TODO`, `FIXME` or stub markers anywhere in the source.
- Every button in the application has a handler, and every internal link resolves to a real route —
  no dead links.
- All 60 client-side fetch calls were cross-checked against the 74 route handlers: no URL or HTTP
  method mismatches.

---

## 7. Verification performed

- **TypeScript:** full project typecheck clean after every change.
- **ESLint:** compared against a pristine checkout of the previous commit in an isolated worktree.
  Baseline had 34 problems; the codebase now has 33. No new rule violation was introduced by any
  fix. Two violations were removed with the dead code; one new warning was added — an intentionally
  unused variable in the `adminNotes` omission, written in exactly the same idiom the neighbouring
  endpoint already uses.
- **S1:** a source-wide search confirms only `requestIp.ts` reads the forwarded-for header.
- **S2:** scrypt cost measured directly (~95 ms) to establish the size of the timing gap.
- **S3:** the new origin check was run against nine bypass variants; none escape the origin.
- **S9:** the real logger was executed and confirmed to emit the error message and stack while still
  redacting secrets at every nesting level.

### Not covered — worth doing before launch

The local database was unavailable, so the following could not be run and are the natural next step.

1. `npm run test` — the existing payment, webhook and reservation suites. Note that
   `docker-compose.yml` publishes port **5432** while `.env.local` points at **5433**; reconcile
   these before starting.
2. `npm run build` — it prerenders the home page, so apply any pending migrations first.
3. A live test purchase end to end, ideally with the network throttled at the moment of payment, to
   confirm W1 behaves as intended.
4. A scripted check that every `/api/admin/*` route answers 403 with a customer cookie and 401 with
   no cookie. The code review says it will; a script would prove it and catch any future regression.
5. Cross-reference the functional fixes against your existing manual QA pack in `qa-testing/` — in
   particular the checkout, wishlist and Design Manager cases, whose expected behaviour has changed.
