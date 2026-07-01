import { db } from "@/lib/db";
import { idempotencyKeys } from "@/db/schema";
import { eq, lt } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("idempotency");

// How long a stored idempotent response stays replayable.
const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24h

interface StoredResult {
  statusCode: number;
  body: unknown;
}

/**
 * Run `handler` at most once per key. If a result for `key` was already stored,
 * its status + body are replayed instead of re-executing the handler — making
 * client retries (double-clicks, network retries) safe on non-idempotent POSTs.
 *
 * The stored body is whatever the handler returns; the caller turns it into a
 * Response. Handlers that need to signal a non-200 status should return
 * `{ statusCode, body }`; a bare value is treated as `{ statusCode: 200, body }`.
 */
export async function withIdempotency(
  key: string,
  handler: () => Promise<StoredResult | unknown>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<StoredResult> {
  // 1. Replay a previously stored result if present and unexpired.
  const existing = await db
    .select()
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, key))
    .limit(1);

  if (existing[0]) {
    if (existing[0].expiresAt > new Date()) {
      log.info("replaying stored response", { key });
      return {
        statusCode: existing[0].statusCode,
        body: JSON.parse(existing[0].responseBody),
      };
    }
    // Expired — clear it so we can re-run.
    await db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, key));
  }

  // 2. Execute the handler.
  const raw = await handler();
  const result: StoredResult =
    raw && typeof raw === "object" && "statusCode" in raw && "body" in raw
      ? (raw as StoredResult)
      : { statusCode: 200, body: raw };

  // 3. Persist for replay. onConflictDoNothing guards against a concurrent
  //    request that stored the same key first (last-writer-loses is fine here).
  await db
    .insert(idempotencyKeys)
    .values({
      key,
      statusCode: result.statusCode,
      responseBody: JSON.stringify(result.body),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    })
    .onConflictDoNothing();

  return result;
}

/** Delete expired idempotency records. Call from the jobs worker / a cron. */
export async function purgeExpiredIdempotencyKeys(): Promise<number> {
  const deleted = await db
    .delete(idempotencyKeys)
    .where(lt(idempotencyKeys.expiresAt, new Date()))
    .returning({ key: idempotencyKeys.key });
  return deleted.length;
}
