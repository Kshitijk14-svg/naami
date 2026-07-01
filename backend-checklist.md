# Backend Concepts Checklist — NAAMI

Audit of the NAAMI backend (Next.js 16 App Router + PostgreSQL/Drizzle + Upstash Redis)
against 17 core backend concepts. Legend: ✅ Applied · ⚠️ Partial · ❌ Not applied.

> This file reflects the state **after** the gap-closing work in
> `.claude/plans/make-a-checklist-*.md`. Items originally Partial/Not-applied and
> now implemented are marked ✅ with an "(added)" note.

| #  | Concept | Status | Evidence |
|----|---------|--------|----------|
| 1  | Authentication & authorization | ✅ Applied | JWT sessions `src/lib/jwt.ts`; route guard `src/lib/adminAuth.ts`; auth flows `src/app/api/auth/*`; edge guard `src/middleware.ts` |
| 2  | Data encryption | ✅ Applied | scrypt password hash `src/lib/password.ts`; TLS env-gated `src/lib/db.ts` (`DATABASE_SSL`); **app-layer AES-256-GCM PII encryption (added)** `src/lib/crypto.ts` |
| 3  | Role-based access control | ✅ Applied | `roleEnum` in `src/db/schema.ts`; `verifyAdminRequest(roles)` `src/lib/adminAuth.ts`; `src/models/roles.ts` |
| 4  | SQL injection prevention | ✅ Applied | Drizzle parameterized queries throughout; `ILIKE` via `sql` bind params `src/db/queries/products.ts` |
| 5  | Caching strategies | ✅ Applied | read-through `getCached` `src/lib/cache.ts`; centralized keys/TTLs; explicit `redisDel` invalidation on writes |
| 6  | Database indexing | ✅ Applied | column indexes + unique indexes across `src/db/schema.ts` (email, slug, code, status, created_at, FK columns) |
| 7  | Read/write splitting | ✅ Applied **(added)** | `dbRead` replica pool `src/lib/db.ts` (falls back to primary when `DATABASE_REPLICA_URL` unset); reads routed to `dbRead` in query modules |
| 8  | Asynchronous processing | ✅ Applied **(added)** | transactional-outbox `jobs` table + `enqueueJob`/`processJobs` `src/lib/jobs.ts`; worker route `src/app/api/internal/process-jobs/route.ts` |
| 9  | Load balancing | ✅ Applied | PM2 cluster (1 worker/vCPU) `ecosystem.config.js` + Nginx reverse proxy (docs) |
| 10 | Database transactions (ACID) | ✅ Applied | `createOrder`, `setProductSizes` use `db.transaction(...)` `src/db/queries/orders.ts`, `products.ts` |
| 11 | Idempotency | ✅ Applied **(added)** | duplicate-order guard + unique index on `orders.razorpay_payment_id`; `withIdempotency` header replay `src/lib/idempotency.ts` in `verify-payment` |
| 12 | Distributed locking | ✅ Applied | `FOR UPDATE` row locks acquired in sorted order `src/db/queries/orders.ts` (`createOrder`); `SKIP LOCKED` job claim `src/lib/jobs.ts` |
| 13 | Soft deletes | ✅ Applied **(added)** | `deletedAt` columns on users/categories/products/collections/coupons/blog; deletes set `deletedAt`; reads filter `isNull(deletedAt)` |
| 14 | Circuit breakers | ✅ Applied | generic breaker `src/lib/circuitBreaker.ts` (`redisCircuit`, `dbCircuit`) |
| 15 | Graceful degradation | ✅ Applied | fail-open Redis wrappers `src/lib/redis.ts` (quota/circuit → cache miss, request proceeds on Postgres) |
| 16 | Centralized logging | ✅ Applied **(added)** | structured JSON logger with secret redaction `src/lib/logger.ts`; used across `src/lib/*` and `src/app/api/**` |
| 17 | Health checks | ✅ Applied **(added)** | liveness `src/app/api/health/route.ts`; readiness (DB/replica/Redis + circuit states) `src/app/api/health/ready/route.ts` |

## Notes on each added item

- **Data encryption (#2):** password auth already used scrypt; added `crypto.ts`
  (AES-256-GCM, `ENCRYPTION_KEY`) for PII columns (shipping phone/address). Encryption in
  transit stays env-gated via `DATABASE_SSL`.
- **Read/write splitting (#7):** a second `pg.Pool` from `DATABASE_REPLICA_URL` backs
  `dbRead`. Writes/transactions stay on the primary `db`. Unset replica URL → `dbRead === db`.
- **Async processing (#8):** transactional outbox — email side effects are enqueued inside the
  order transaction and drained by a worker, replacing fire-and-forget `.catch()` sends.
- **Idempotency (#11):** `verify-payment` now no-ops on a repeated `razorpayPaymentId` (unique
  index enforces it at the DB), and supports an `Idempotency-Key` header for safe client retries.
- **Soft deletes (#13):** destructive admin deletes now set `deletedAt`; all reads exclude
  soft-deleted rows. History (orders/order_items) is preserved.
- **Centralized logging (#16):** one JSON-line logger with level/timestamp/context and secret
  redaction, replacing scattered `console.*` calls.
- **Health checks (#17):** `/api/health` (liveness, no deps) and `/api/health/ready`
  (readiness: DB + replica + Redis ping, reports circuit-breaker state, 503 when DB is down).
