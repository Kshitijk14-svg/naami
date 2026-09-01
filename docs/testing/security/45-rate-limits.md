# 45 — Rate Limiting

Eight limiters. **All of them fail open** — if Redis is unreachable or over quota,
every one silently stops enforcing.

| Route | Key | Limit | IP source |
|---|---|---|---|
| `POST /api/auth/login` | `login:{ip}` | 10 / 5 min | ⚠ **spoofable** |
| `POST /api/auth/send-otp` | `otp-send:{ip}` | 5 / 10 min | hardened |
| `POST /api/auth/verify-otp` | `otp-verify:{ip}` | 10 / 5 min | ⚠ **spoofable** |
| `POST /api/checkout/create-order` | `checkout:{email}` | 12 / 5 min | per-account |
| `POST /api/checkout/verify-payment` | `verify-payment:{email}` | 20 / 5 min | per-account |
| `POST /api/checkout/apply-coupon` | `coupon:{ip}` | 10 / 1 min | hardened |
| `POST /api/cart/availability` | `cart-availability:{ip}` | 60 / 1 min | hardened |
| `POST /api/feedback` | `feedback:{userId}` | 5 / 1 hr | per-account |

**No rate limit at all on:** every `/api/admin/**` route, wishlist, orders,
products, collections, search, design endpoints, the webhook, process-jobs, health,
signout, and `/api/auth/me`.

> ⚠ Nearly everything here is `[LOCAL-ONLY]`. Brute-forcing production will
> degrade service for real customers and may get your own IP throttled upstream.

**Area prefix:** `TC-SEC-RL`

---

## Check Redis first

A limiter that "passes" may simply mean Redis is down.

- [ ] **TC-SEC-RL-001** `[PROD-SAFE]` — Redis is actually up
  ```bash
  curl -s "$BASE/api/health/ready" | python -m json.tool
  ```
  **Expect:** `"redis": "ok"`. If it says `down` or `circuit-open`, **every limiter
  below is currently disabled** — fix that before drawing conclusions.

---

## The XFF bypass — the headline finding

⚠ **KNOWN** KI-001.

- [ ] **TC-SEC-RL-002** `[LOCAL-ONLY]` — **Login throttling is bypassable**
  - **Steps:**
    ```bash
    # 1. Confirm the limiter works with a fixed header
    for i in $(seq 1 15); do
      printf '%s ' "$(curl -s -o /dev/null -w '%{http_code}' \
        -X POST "$BASE/api/auth/login" \
        -H 'content-type: application/json' \
        -H 'X-Forwarded-For: 203.0.113.9' \
        -d '{"email":"you@example.com","password":"wrong"}')"
    done; echo
    ```
    **Expect:** 401s that become **429** around the 11th.
    ```bash
    # 2. Now rotate the header on every request
    for i in $(seq 1 30); do
      printf '%s ' "$(curl -s -o /dev/null -w '%{http_code}' \
        -X POST "$BASE/api/auth/login" \
        -H 'content-type: application/json' \
        -H "X-Forwarded-For: 203.0.113.$i" \
        -d '{"email":"you@example.com","password":"wrong"}')"
    done; echo
    ```
    **Expect:** it should still throttle. **Known defect:** all 30 return 401 with
    **no 429** — the limiter reads the first XFF entry, which the client controls.
  - **Record the result of both loops.** The contrast is the evidence.

- [ ] **TC-SEC-RL-003** `[LOCAL-ONLY]` — OTP-verify throttling is bypassable the same way
  - **Steps:** repeat with `POST /api/auth/verify-otp` and rotating headers
  - **Expect:** no 429. Note the per-OTP 3-attempt counter still limits guessing of
    any **single** code — that is the real control here.

- [ ] **TC-SEC-RL-004** `[LOCAL-ONLY]` — **The hardened routes are NOT bypassable**
  - **Steps:** rotate the header against `POST /api/auth/send-otp`
    ```bash
    for i in $(seq 1 12); do
      printf '%s ' "$(curl -s -o /dev/null -w '%{http_code}' \
        -X POST "$BASE/api/auth/send-otp" \
        -H 'content-type: application/json' \
        -H "X-Forwarded-For: 198.51.100.$i" \
        -d '{"email":"probe@example.com"}')"
    done; echo
    ```
  - **Expect:** **429 after 5**, despite the rotating header — this route uses the
    hardened helper that counts from the right. This proves the fix works and
    isolates the gap to the two auth routes.

- [ ] **TC-SEC-RL-005** `[LOCAL-ONLY]` — `apply-coupon` and `cart/availability` also hold

---

## Each limiter

- [ ] **TC-SEC-RL-009** `[LOCAL-ONLY]` — Login: 429 after 10 in 5 minutes (fixed IP)
  - **Expect:** the 11th returns **429** "Too many attempts. Please wait a moment
    and try again."
- [ ] **TC-SEC-RL-010** `[LOCAL-ONLY]` — The window resets after 5 minutes
- [ ] **TC-SEC-RL-011** `[LOCAL-ONLY]` — Send-OTP: 429 after 5 in 10 minutes
- [ ] **TC-SEC-RL-012** `[LOCAL-ONLY]` — Verify-OTP: 429 after 10 in 5 minutes
- [ ] **TC-SEC-RL-013** `[LOCAL-ONLY]` — Create-order: 429 after 12 in 5 minutes
  - **Note:** keyed by **email**, so a rotating IP does not help. Verify that.
- [ ] **TC-SEC-RL-014** `[LOCAL-ONLY]` — Verify-payment: 429 after 20 in 5 minutes
- [ ] **TC-SEC-RL-015** `[LOCAL-ONLY]` — Apply-coupon: 429 after 10 in 1 minute
- [ ] **TC-SEC-RL-016** `[LOCAL-ONLY]` — Cart availability: 429 after 60 in 1 minute
- [ ] **TC-SEC-RL-017** `[LOCAL-ONLY]` — Feedback: 429 after 5 in 1 hour
  - **Note:** keyed by **user id**.

---

## Per-account limiters

- [ ] **TC-SEC-RL-021** `[LOCAL-ONLY]` — Account-keyed limits are not IP-bypassable
  - **Steps:** hit `create-order` 15 times as one account from rotating IPs
  - **Expect:** **429** regardless — the key is the email.
- [ ] **TC-SEC-RL-022** `[LOCAL-ONLY]` — One account's limit does not affect another
  - **Steps:** 1. Exhaust A's checkout limit 2. Immediately try as B
  - **Expect:** B works normally.
- [ ] **TC-SEC-RL-023** `[LOCAL-ONLY]` — An attacker with many accounts is not limited
  - **Expect:** confirm — per-account limiting means account creation is the real
    control. Since signup requires an OTP, that is throttled at 5 per 10 minutes per
    IP. Record the chain.

---

## Unlimited endpoints

Not defects in themselves — but confirm the exposure and decide if it matters.

- [ ] **TC-SEC-RL-027** `[LOCAL-ONLY]` — `/api/search` is unauthenticated and unthrottled
  - **Steps:** fire 500 requests with varied 2-character queries and time them
  - **Expect:** no 429. Record response times as concurrency rises — this is a
    DB-backed query with no cap.
- [ ] **TC-SEC-RL-028** `[LOCAL-ONLY]` — `/api/products` is unthrottled
  - **Note:** returns the entire catalogue with sizes, images and metafields each
    time.
- [ ] **TC-SEC-RL-029** `[LOCAL-ONLY]` — `/api/collections` does N+1 queries
  - **Steps:** fire 200 concurrent requests and watch database load
  - **Expect:** one extra query per collection per request. Record the amplification
    factor.
- [ ] **TC-SEC-RL-030** `[LOCAL-ONLY]` — Admin routes are entirely unthrottled
  - **Expect:** confirm. Requires an admin session first, so lower risk — but note
    it, particularly for `send-invoice` which emails a customer on every call.
- [ ] **TC-SEC-RL-031** `[LOCAL-ONLY]` — `send-invoice` can be used to email-bomb
  - **Steps:** call it 20 times for one order
  - **Expect:** 20 emails to that customer. **S2** — an admin account compromise
    turns into a spam incident.
- [ ] **TC-SEC-RL-032** `[LOCAL-ONLY]` — The webhook is unthrottled
  - **Note:** deliberate — Razorpay retries and must not be blocked. Signature
    verification is the control. Confirm a flood of bad-signature requests is cheap
    to reject.

---

## Fail-open

- [ ] **TC-SEC-RL-036** `[LOCAL-ONLY]` — **Every limiter stops when Redis is unreachable**
  - **Steps:** 1. Break `UPSTASH_REDIS_REST_TOKEN` locally 2. Restart 3. Try 20
    failed logins with a fixed IP
  - **Expect:** **no 429 at all.** This is deliberate — availability over
    enforcement — but it means an attacker who can exhaust your Upstash quota
    disables every rate limit at once.
  - **Record as S2** with the mitigation: monitor `/api/health/ready` for
    `redis: down` and alert on it.
- [ ] **TC-SEC-RL-037** `[LOCAL-ONLY]` — The site still functions with Redis down
  - **Expect:** pages render, checkout works — only caching and limiting degrade.
- [ ] **TC-SEC-RL-038** `[LOCAL-ONLY]` — Quota exhaustion behaves like an outage
  - **Expect:** the same fail-open path.
- [ ] **TC-SEC-RL-039** `[PROD-SAFE]` — `/api/health/ready` reports Redis state accurately
  - **Expect:** it does. **That endpoint is also unauthenticated (KI-007)** — so an
    attacker can watch for the moment rate limiting goes down. Note that
    combination explicitly in your report; individually they are S2 and S3, together
    they are worse.

---

## Bypass attempts

- [ ] **TC-SEC-RL-043** `[LOCAL-ONLY]` — `X-Real-IP` cannot be spoofed past nginx
  - **Steps:** send a request with your own `X-Real-IP: 1.2.3.4`
  - **Expect:** nginx **overwrites** it with the real peer address, so the spoof is
    ignored. Verify your nginx config sets `proxy_set_header X-Real-IP $remote_addr`.
  - **If it does not overwrite, every hardened limiter becomes bypassable — S2.**
- [ ] **TC-SEC-RL-044** `[LOCAL-ONLY]` — Omitting all IP headers does not disable limits
  - **Steps:** request directly against the app port with no headers
  - **Expect:** the fallback key is used, not a skipped check.
- [ ] **TC-SEC-RL-045** `[LOCAL-ONLY]` — Case variations do not create separate buckets
  - **Steps:** try `x-forwarded-for` vs `X-Forwarded-For`
  - **Expect:** identical treatment — HTTP headers are case-insensitive.
- [ ] **TC-SEC-RL-046** `[LOCAL-ONLY]` — Changing the User-Agent does not reset the limit
- [ ] **TC-SEC-RL-047** `[LOCAL-ONLY]` — Clearing cookies does not reset an IP-keyed limit
- [ ] **TC-SEC-RL-048** `[LOCAL-ONLY]` — **The per-IP coupon cap is skipped with no IP**
  - **Steps:** call `apply-coupon` directly against the app port with no
    `X-Real-IP` or `X-Forwarded-For`
  - **Expect:** the per-IP redemption cap is not applied at all — the check is
    skipped when the IP is null.
  - **Then confirm nginx always sets `X-Real-IP` in production**, which makes this
    unreachable from outside. Record as **S3** with that mitigation noted.
