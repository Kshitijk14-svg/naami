# 40 — Security Testing: Overview

Manual security verification for NAAMI. Eight areas, each in its own file.

| File | Covers |
|---|---|
| [`41-auth-session.md`](41-auth-session.md) | Token forgery, cookie attributes, revocation, the reset-flow takeover chain |
| [`42-access-control.md`](42-access-control.md) | IDOR, role boundaries, admin API exposure |
| [`43-payment.md`](43-payment.md) | Payment tampering, replay, cross-account fulfilment |
| [`44-injection-xss.md`](44-injection-xss.md) | Stored XSS, HTML injection, SQL probes |
| [`45-rate-limits.md`](45-rate-limits.md) | The eight limiters, XFF spoofing, fail-open |
| [`46-headers-transport.md`](46-headers-transport.md) | HSTS, CSP, TLS, information disclosure |
| [`47-uploads-security.md`](47-uploads-security.md) | File-type confusion, path traversal |
| [`48-webhook.md`](48-webhook.md) | Signature forgery, raw-body tampering, replay |

---

## Rules of engagement

You are testing **your own production system**. That is legitimate, but it is still
a live store with real customers and real money.

**Do:**
- Run everything tagged `[PROD-SAFE]` freely.
- Run `[PROD-DATA]` cases off-peak and clean up afterwards.
- Use your own test accounts as both attacker and victim.
- Record exact requests and responses — a security finding without a reproduction
  is not actionable.

**Do not:**
- Run `[LOCAL-ONLY]` cases against production. These include brute-force probes,
  stock exhaustion and forged-payment replays. They will degrade service for real
  customers or leave orphaned records.
- Test against anything you do not own.
- Leave a test payload live. XSS probes in journal posts, announcement bars or
  tracking URLs are **site-wide** — remove them the moment the case is done.
- Use a real customer's account or data as the "victim" in an IDOR test.

---

## What you need

Set these up once, from [`00-setup.md`](../00-setup.md):

```bash
export BASE=https://naamiofficial.in
export SESSION_CUSTOMER='...'    # customer account cookie
export SESSION_CUSTOMER_B='...'  # a SECOND customer — the IDOR victim
export SESSION_STAFF='...'
export SESSION_ADMIN='...'
```

You also need, noted down:
- An order id owned by **customer A** and one owned by **customer B**
- A product id, an unpublished product id
- A coupon code

---

## Severity for security findings

| Level | Meaning | Examples |
|---|---|---|
| **S1** | Money, or another user's data, is reachable | Reading someone else's order; paying ₹1 for ₹50,000; script executing in another user's session |
| **S2** | A control is defeated but exploitation needs a precondition | A rate limit bypassed; a privilege boundary crossed within staff scope |
| **S3** | Weakens defence in depth | Information disclosure; a missing header |
| **S4** | Hygiene | An overly verbose error |

**Stop and report immediately** on any S1. Do not continue the checklist.

---

## Known before you start

Six security-relevant defects are already logged in
[`../KNOWN-ISSUES.md`](../KNOWN-ISSUES.md). Cases that reproduce them are marked
`⚠ KNOWN` — confirm they still reproduce, then move on.

| ID | Severity | Summary |
|---|---|---|
| KI-004 | S1 | Password reset is a full account-takeover path, including admin accounts |
| KI-005 | S1 | Video upload writes a client-controlled file extension under `public/` |
| KI-006 | S1 | Staff can read every customer's orders and PII, unpaginated |
| KI-007 | S1 | `/api/health/ready` discloses DB, replica and Redis state unauthenticated |
| KI-001 | S2 | Login and OTP-verify rate limits are bypassable via `X-Forwarded-For` |
| KI-017 | S2 | No CSRF protection anywhere; `signout` needs no session |

---

## What the recent hardening already fixed

Do not spend time re-testing these from scratch — verify the guard holds, then move
on. Cases are in `43-payment.md` and `42-access-control.md`.

- Payments are bound to a server-side checkout intent; the client's `items` array
  is never read at verification.
- Every payment is confirmed against Razorpay's API before an order is created.
- Stock is held **before** payment, so two buyers racing for the last unit collide
  at checkout, not after being charged.
- A demoted or deactivated admin loses API access immediately.
- Order ownership mismatches return **404**, never 403.
- Journal post bodies are HTML-escaped.
- The `/api/cart/availability` endpoint no longer leaks unpublished stock.

---

## Reporting

Use the bug template in [`../README.md`](../README.md), plus:

```markdown
**Attack scenario**
Who can do this, what they need first, and what they gain.

**Reproduction**
The exact curl or steps, with a real response captured.

**Impact**
Money / data / availability — be specific about which and how much.
```

Never include a working exploit against live customer data in a written report.
Describe the class of problem and reproduce it against your own test accounts.
