# 46 — Headers, Transport & Information Disclosure

**Area prefix:** `TC-SEC-HDR`

---

## Baseline

```bash
curl -sI https://naamiofficial.in | sort
```

Keep this output — several cases below compare against it.

---

## Security headers

- [ ] **TC-SEC-HDR-001** `[PROD-SAFE]` — All expected headers are present
  ```bash
  curl -sI "$BASE" | grep -iE 'strict-transport|content-security|permissions-policy|x-content-type|x-frame|referrer'
  ```
  **Expect** six lines:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Content-Security-Policy-Report-Only: …`
  - `Permissions-Policy: camera=(), microphone=(), …`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`

- [ ] **TC-SEC-HDR-002** `[PROD-SAFE]` — Headers are present on **every** route type
  ```bash
  for p in / /collection /cart /auth /api/products /_next/static/chunks/main.js; do
    printf '\n=== %s ===\n' "$p"
    curl -sI "$BASE$p" | grep -icE 'strict-transport'
  done
  ```
  **Expect:** `1` for each. **Note `/_next/static/` declares its own `add_header`,
  which makes nginx drop every inherited one** unless they were re-declared. If it
  returns `0` there, the nginx include is missing from that block — **S3**.

- [ ] **TC-SEC-HDR-003** `[PROD-SAFE]` — Headers are present on error responses
  ```bash
  curl -sI "$BASE/this-does-not-exist" | grep -ic 'strict-transport'
  ```
  **Expect:** `1` — the `always` flag should cover 4xx.

- [ ] **TC-SEC-HDR-004** `[PROD-SAFE]` — HSTS max-age is at least a year
- [ ] **TC-SEC-HDR-005** `[PROD-SAFE]` — `X-Frame-Options` prevents framing
  - **Steps:** build a local page with `<iframe src="https://naamiofficial.in">`
  - **Expect:** it refuses to render.
- [ ] **TC-SEC-HDR-006** `[PROD-SAFE]` — The checkout page cannot be framed
  - **Expect:** the same — clickjacking a payment page is the worst case.
- [ ] **TC-SEC-HDR-007** `[PROD-SAFE]` — `Permissions-Policy` denies camera, mic and geolocation

---

## CSP (currently report-only)

- [ ] **TC-SEC-HDR-011** `[PROD-SAFE]` — CSP is in **report-only** mode
  - **Expect:** the header name is `Content-Security-Policy-Report-Only`. Nothing is
    blocked yet — this is intentional during the observation window.
- [ ] **TC-SEC-HDR-012** `[PROD-SAFE]` — Browsing produces no CSP violations
  - **Steps:** with the Console open, visit every customer page
  - **Expect:** no "Report Only" violation messages. **Record every one you see** —
    these are what must be resolved before enforcing.
- [ ] **TC-SEC-HDR-013** `[PROD-DATA]` — A full checkout produces no violations
  - **Steps:** run a ₹1 purchase through the Razorpay popup with the Console open
  - **Expect:** none. The Razorpay widget is the most likely source, and the whole
    reason the policy is report-only first.
- [ ] **TC-SEC-HDR-014** `[PROD-SAFE]` — The policy allowlists what the site actually uses
  - **Expect:** `checkout.razorpay.com`, `api.razorpay.com`,
    `lumberjack.razorpay.com`, `connect.facebook.net`, `www.facebook.com`.
- [ ] **TC-SEC-HDR-015** `[PROD-SAFE]` — `object-src 'none'` and `base-uri 'self'` are set
- [ ] **TC-SEC-HDR-016** `[PROD-SAFE]` — `frame-ancestors 'self'` is set
- [ ] **TC-SEC-HDR-017** `[PROD-SAFE]` — `'unsafe-inline'` and `'unsafe-eval'` are present in `script-src`
  - **Expect:** they are — Next.js inlines its hydration payload. Record this: it
    substantially weakens the policy's XSS value. A nonce-based policy would be
    stronger, and is the natural follow-up once report-only is clean.
- [ ] **TC-SEC-HDR-018** `[PROD-SAFE]` — After a clean observation window, plan the switch
  - **Steps:** rename the header to `Content-Security-Policy` in
    `/etc/nginx/snippets/naami-security.conf` and reload
  - **Expect:** do **not** do this until TC-SEC-HDR-012 and -013 are both clean.

---

## TLS

- [ ] **TC-SEC-HDR-022** `[PROD-SAFE]` — http redirects to https
  ```bash
  curl -sI http://naamiofficial.in | head -3
  ```
  **Expect:** `301` to the https URL.
- [ ] **TC-SEC-HDR-023** `[PROD-SAFE]` — `www` redirects consistently
- [ ] **TC-SEC-HDR-024** `[PROD-SAFE]` — The certificate is valid and not near expiry
  ```bash
  echo | openssl s_client -connect naamiofficial.in:443 -servername naamiofficial.in 2>/dev/null \
    | openssl x509 -noout -dates -issuer
  ```
  **Expect:** valid, issued by Let's Encrypt, more than 14 days remaining.
- [ ] **TC-SEC-HDR-025** `[PROD-SAFE]` — Certbot auto-renewal is configured
  ```bash
  sudo systemctl list-timers | grep certbot
  ```
- [ ] **TC-SEC-HDR-026** `[PROD-SAFE]` — TLS 1.0 and 1.1 are refused
  ```bash
  openssl s_client -connect naamiofficial.in:443 -tls1_1 2>&1 | grep -i 'protocol\|error' | head -3
  ```
  **Expect:** the handshake fails.
- [ ] **TC-SEC-HDR-027** `[PROD-SAFE]` — TLS 1.2 and 1.3 work
- [ ] **TC-SEC-HDR-028** `[PROD-SAFE]` — An external scan gives a good grade
  - **Steps:** run ssllabs.com/ssltest against the domain
  - **Expect:** A or better. Record anything it flags.
- [ ] **TC-SEC-HDR-029** `[PROD-SAFE]` — No mixed content anywhere
  - **Steps:** browse the whole site with the Console open
  - **Expect:** no mixed-content warnings.

---

## Information disclosure

- [ ] **TC-SEC-HDR-033** `[PROD-SAFE]` — **`/api/health/ready` is unauthenticated**
  ```bash
  curl -s "$BASE/api/health/ready" | python -m json.tool
  ```
  **Expect:** it returns DB, replica and Redis status plus circuit-breaker states —
  **to anyone.** ⚠ **KNOWN** KI-007.
  - **Impact:** an attacker learns your topology and, critically, **when rate
    limiting is failing open**. Report S3 on its own; note the combination with
    KI-001 in your write-up.

- [ ] **TC-SEC-HDR-034** `[PROD-SAFE]` — `/api/health` discloses process uptime
  - **Expect:** `{"status":"ok","uptime":…}`. Minor — S4.

- [ ] **TC-SEC-HDR-035** `[PROD-SAFE]` — No server version headers
  ```bash
  curl -sI "$BASE" | grep -iE 'server|x-powered-by'
  ```
  **Expect:** ideally neither, or a bare `nginx` with no version.

- [ ] **TC-SEC-HDR-036** `[PROD-SAFE]` — Errors do not leak stack traces
  - **Steps:** trigger a 500 — e.g. malformed JSON to an admin route
  - **Expect:** no file paths, no stack, no SQL. **A stack trace in production is
    S3.**

- [ ] **TC-SEC-HDR-037** `[PROD-SAFE]` — Source maps are not served
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' "$BASE/_next/static/chunks/main.js.map"
  ```
  **Expect:** **404**.

- [ ] **TC-SEC-HDR-038** `[PROD-SAFE]` — Sensitive files are not reachable
  ```bash
  for f in /.env /.env.production /.git/config /package.json /drizzle.config.ts \
           /ecosystem.config.js /docker-compose.yml; do
    printf '%-24s %s\n' "$f" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$f")"
  done
  ```
  **Expect:** **404** for every one. **Anything else is S1.**

- [ ] **TC-SEC-HDR-039** `[PROD-SAFE]` — Directory listing is disabled
  - **Steps:** request `/images/`, `/videos/`, `/_next/`
  - **Expect:** 403 or 404, never a file index.

- [ ] **TC-SEC-HDR-040** `[PROD-SAFE]` — No `NEXT_PUBLIC_` secret leaks in the bundle
  - **Steps:** 1. View source 2. Search the JS for `secret`, `KEY_SECRET`,
    `JWT_SECRET`, `RESEND`, `UPSTASH`
  - **Expect:** only the Razorpay **key id** and the Meta Pixel id — both are meant
    to be public. **Any secret found is S1.**

- [ ] **TC-SEC-HDR-041** `[PROD-SAFE]` — `robots.txt` and the sitemap do not expose admin
  ```bash
  curl -s "$BASE/robots.txt"; curl -s "$BASE/sitemap.xml" | grep -i admin
  ```
  **Expect:** no admin paths in the sitemap.

---

## Cookies & CORS

- [ ] **TC-SEC-HDR-045** `[PROD-SAFE]` — Only the session cookie is set
  ```bash
  curl -sI "$BASE" | grep -i set-cookie
  ```
  **Expect:** nothing on an anonymous request, or only non-sensitive cookies.
- [ ] **TC-SEC-HDR-046** `[PROD-SAFE]` — No CORS headers allow arbitrary origins
  ```bash
  curl -sI "$BASE/api/products" -H 'Origin: https://evil.example' | grep -i access-control
  ```
  **Expect:** **no** `Access-Control-Allow-Origin`. A wildcard with credentials
  would be **S1**.
- [ ] **TC-SEC-HDR-047** `[PROD-SAFE]` — Preflight is not permissively answered
  ```bash
  curl -sI -X OPTIONS "$BASE/api/checkout/create-order" \
    -H 'Origin: https://evil.example' \
    -H 'Access-Control-Request-Method: POST' | head -5
  ```
  **Expect:** no permissive CORS response.

---

## Webhook path

- [ ] **TC-SEC-HDR-051** `[PROD-SAFE]` — The webhook path is reachable
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/webhooks/razorpay" \
    -H 'x-razorpay-signature: bogus' -d '{}'
  ```
  **Expect:** **401** once the secret is configured, **503** before that. A **404**
  means nginx is not routing it.
- [ ] **TC-SEC-HDR-052** `[PROD-SAFE]` — The raw body reaches the app unmodified
  - **See** `48-webhook.md` — if signature verification works at all, the body is
    arriving intact.

---

## Caching

- [ ] **TC-SEC-HDR-056** `[PROD-SAFE]` — Authenticated responses are not cacheable
  ```bash
  curl -sI "$BASE/api/orders" -H "cookie: naami_session=$SESSION_CUSTOMER" | grep -i cache-control
  ```
  **Expect:** `no-store` or `private`. **A public cache directive on personal data
  is S2** — a shared proxy could serve one customer's orders to another.
- [ ] **TC-SEC-HDR-057** `[PROD-SAFE]` — `/api/cart/availability` sets `no-store`
- [ ] **TC-SEC-HDR-058** `[PROD-SAFE]` — Static assets are cached immutably
- [ ] **TC-SEC-HDR-059** `[PROD-SAFE]` — `/admin` pages are not cached
- [ ] **TC-SEC-HDR-060** `[PROD-SAFE]` — Back-button after sign-out shows no private data
  - **Steps:** 1. Sign in, view `/profile` 2. Sign out 3. Press Back
  - **Expect:** you are redirected to `/auth`, not shown a cached profile.
