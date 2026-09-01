# 32 — Emails

Six emails across **two different providers**. Getting this split wrong is a common
source of "why did nothing arrive".

| Email | Provider | From | Trigger |
|---|---|---|---|
| **OTP code** | **Gmail / nodemailer** | `GMAIL_USER` | signup or reset request |
| Order confirmation | Resend | `RESEND_FROM` | order created after payment |
| Invoice | Resend | `RESEND_FROM` | admin clicks Send Invoice |
| Order status update | Resend | `RESEND_FROM` | admin changes status |
| Tracking update | Resend | `RESEND_FROM` | tracking changes on a shipped order |
| Abandoned cart | Resend | `RESEND_FROM` | cart idle ~6h, via the worker |
| Low stock alert | Resend | `ADMIN_EMAIL` | stock crosses the threshold downward |

**The OTP is the only one on Gmail.** If OTP works but order emails do not, the
problem is Resend, not the mail setup in general — and vice versa.

**Area prefix:** `TC-EML`

---

## Prerequisites

- [ ] **TC-EML-001** `[PROD-SAFE]` — Confirm which providers are configured
  ```bash
  grep -E '^(GMAIL_USER|GMAIL_PASS|RESEND_API_KEY|RESEND_FROM|ADMIN_EMAIL)=' \
    .env.production | sed -E 's/=(.{0,8}).*/=\1…/'
  ```
  **Expect:** all five have real values. `GMAIL_PASS` must be a 16-character Google
  **App Password**, not the account password.

- [ ] **TC-EML-002** `[PROD-SAFE]` — `RESEND_FROM` uses a verified domain
  - **Steps:** 1. Read the value 2. Check that domain shows Verified in the Resend
    dashboard
  - **Expect:** verified. If it falls back to `onboarding@resend.dev`, customer
    email **silently does not arrive** — S1 before launch.

- [ ] **TC-EML-003** `[PROD-SAFE]` — The jobs worker is running
  ```bash
  pm2 status
  pm2 logs naami --lines 100 --nostream | grep 'worker run complete' | tail -3
  ```
  **Expect:** `naami-worker` online, and recent completions. **No worker means no
  Resend email at all** — the queue is drained by that process.

---

## OTP email (Gmail)

- [ ] **TC-EML-007** `[PROD-DATA]` — A signup OTP arrives
  - **Expect:** within a minute, from `"NAAMI Atelier" <GMAIL_USER>`.
- [ ] **TC-EML-008** `[PROD-DATA]` — The code is 6 digits and matches what works
- [ ] **TC-EML-009** `[PROD-DATA]` — A reset OTP arrives with reset-appropriate wording
- [ ] **TC-EML-010** `[PROD-DATA]` — **No email is sent for an unknown reset address**
  - **Steps:** 1. Request a reset for an address with no account 2. Check that
    mailbox
  - **Expect:** nothing arrives, even though the UI showed the OTP screen — the
    non-enumeration behaviour.
- [ ] **TC-EML-011** `[PROD-DATA]` — Resend delivers a **new** working code
- [ ] **TC-EML-012** `[PROD-DATA]` — The email is not flagged as spam
  - **Steps:** check Gmail, Outlook and one other provider
  - **Expect:** inbox, not junk. Gmail SMTP has weaker deliverability than a
    verified domain — record where it lands.
- [ ] **TC-EML-013** `[PROD-DATA]` — The email renders correctly on mobile
- [ ] **TC-EML-014** `[PROD-SAFE]` — The sender address is the Gmail account
  - **Note:** this differs from every other email, which come from your own domain.
    Record the inconsistency — it looks unprofessional and hurts trust.

---

## Order confirmation (Resend)

- [ ] **TC-EML-018** `[PROD-DATA]` — Arrives after a successful purchase
  - **Expect:** subject `Your NAAMI Order — ORD-XXXX`.
- [ ] **TC-EML-019** `[PROD-DATA]` — Sent to the **session** email, not the form email
  - **Steps:** 1. Sign in as A 2. At checkout enter a **different** email in the
    Email field 3. Complete the purchase
  - **Expect:** the confirmation goes to **A's account address**. This is
    deliberate — it prevents using the store to mail strangers.
- [ ] **TC-EML-020** `[PROD-DATA]` — Contents are correct
  - **Check:** order id, every item with size and quantity, correct line and grand
    totals, discount if any, shipping address.
- [ ] **TC-EML-021** `[PROD-DATA]` — Amounts match the order record exactly
- [ ] **TC-EML-022** `[PROD-DATA]` — The support contact is `ADMIN_EMAIL`
  - **Note:** `ADMIN_EMAIL` is **customer-visible** in this email. Confirm it is a
    monitored address, not a personal one.
- [ ] **TC-EML-023** `[PROD-DATA]` — Renders correctly in Gmail, Outlook and on mobile
- [ ] **TC-EML-024** `[PROD-DATA]` — Appears in the Resend dashboard as delivered

---

## Invoice (Resend)

- [ ] **TC-EML-028** `[PROD-DATA]` — Arrives after "Send Invoice to Customer"
  - **Expect:** subject `Invoice NAAMI-INV-YYYY-NNNN — NAAMI Order ORD-XXXX`.
- [ ] **TC-EML-029** `[PROD-DATA]` — A PDF is attached
- [ ] **TC-EML-030** `[PROD-DATA]` — The PDF opens and is correct
  - **Check:** invoice number, order id, date, items, totals, addresses.
- [ ] **TC-EML-031** `[PROD-DATA]` — The invoice number matches the admin display
- [ ] **TC-EML-032** `[PROD-DATA]` — Sending twice delivers two emails
  - **Expect:** no deduplication. Record as S3.

---

## Status update (Resend)

- [ ] **TC-EML-036** `[PROD-DATA]` — Confirmed → an email arrives
- [ ] **TC-EML-037** `[PROD-DATA]` — Shipped → an email arrives with tracking if set
- [ ] **TC-EML-038** `[PROD-DATA]` — Delivered → an email arrives
- [ ] **TC-EML-039** `[PROD-DATA]` — Cancelled → an email arrives
- [ ] **TC-EML-040** `[PROD-DATA]` — Subject and body match the status
- [ ] **TC-EML-041** `[PROD-DATA]` — An order with no email sends nothing and does not error

## Tracking update (Resend)

- [ ] **TC-EML-045** `[PROD-DATA]` — Changing tracking on a **shipped** order emails
- [ ] **TC-EML-046** `[PROD-DATA]` — Re-saving identical tracking sends **nothing**
- [ ] **TC-EML-047** `[PROD-DATA]` — Changing tracking on a pending order sends nothing
- [ ] **TC-EML-048** `[PROD-DATA]` — Clearing the tracking number sends nothing

## Abandoned cart (Resend)

- [ ] **TC-EML-052** `[PROD-DATA]` — Sent after the configured idle period
  - **Steps:** 1. Start a checkout without paying 2. Wait for
    `ABANDONED_CART_REMINDER_HOURS` (default 6) 3. Check the mailbox
  - **Expect:** subject "Your NAAMI cart is waiting" with the items listed.
- [ ] **TC-EML-053** `[PROD-DATA]` — Only **one** reminder is sent per cart
  - **Steps:** wait through two more worker cycles
  - **Expect:** no second email — the row is claimed when the first is enqueued.
- [ ] **TC-EML-054** `[PROD-DATA]` — Completing the purchase stops the reminder
- [ ] **TC-EML-055** `[PROD-DATA]` — The reminder goes to the account address

## Low stock alert (Resend)

- [ ] **TC-EML-059** `[PROD-DATA]` — Sent when stock crosses the threshold downward
  - **Expect:** subject `[NAAMI] Low Stock Alert — N product(s)`, sent to
    `ADMIN_EMAIL`.
- [ ] **TC-EML-060** `[PROD-DATA]` — Not re-sent at the same low level
- [ ] **TC-EML-061** `[PROD-DATA]` — A purchase that crosses the threshold also triggers it
  - **Steps:** 1. Set stock to threshold+1 2. Buy one 3. Check the mailbox
- [ ] **TC-EML-062** `[PROD-DATA]` — Nothing is sent when `ADMIN_EMAIL` is unset

---

## Deliverability

- [ ] **TC-EML-066** `[PROD-SAFE]` — SPF, DKIM and DMARC are configured
  ```bash
  dig +short TXT naamiofficial.in | grep spf
  dig +short TXT _dmarc.naamiofficial.in
  ```
  **Expect:** an SPF record and a DMARC record. DKIM comes from the Resend
  dashboard's domain page.
- [ ] **TC-EML-067** `[PROD-DATA]` — Nothing lands in spam across three providers
- [ ] **TC-EML-068** `[PROD-SAFE]` — The Resend dashboard shows no bounces or failures
- [ ] **TC-EML-069** `[PROD-DATA]` — Every email renders with images blocked
  - **Steps:** disable remote images in your mail client
  - **Expect:** still readable and actionable.
- [ ] **TC-EML-070** `[PROD-DATA]` — Every email has a sensible plain-text fallback

---

## Queue behaviour

- [ ] **TC-EML-074** `[PROD-DATA]` — Emails are queued, not sent inline
  - **Steps:** 1. Place an order 2. Time how long the checkout response takes
  - **Expect:** the response is fast; the email follows within the worker's 30s
    cycle. The order must not wait on the mail server.
- [ ] **TC-EML-075** `[LOCAL-ONLY]` — A failed send does not lose the order
  - **Steps:** 1. Break the Resend key 2. Place an order
  - **Expect:** the order is created normally; only the email fails. Check the job
    row records the failure.
- [ ] **TC-EML-076** `[LOCAL-ONLY]` — Failed jobs are retried
  - **Steps:** 1. Break the key, place an order 2. Fix the key 3. Wait for the
    worker
  - **Expect:** the email eventually arrives. Record the retry behaviour.
- [ ] **TC-EML-077** `[PROD-DATA]` — Stopping the worker stops all Resend email
  - **Steps:** 1. `pm2 stop naami-worker` 2. Place an order 3. Check the mailbox
  - **Expect:** no email until the worker restarts, at which point it arrives.
  - **Cleanup:** `pm2 start naami-worker`
