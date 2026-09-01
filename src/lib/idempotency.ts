import { db } from "@/lib/db";
import { idempotencyKeys } from "@/db/schema";
import { eq, lt, and, sql } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("idempotency");

// How long a stored idempotent response stays replayable.
const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24h

// A key reserved but never completed is reclaimable after this long, so a
// crashed handler cannot block its key until the full TTL expires.
const IN_FLIGHT_GRACE_MS = 60_000;

interface StoredResult {
  statusCode: number;
  body: unknown;
}

/** Signals that another request holds this key and is still working on it. */
export class IdempotencyInFlightError extends Error {
  constructor(readonly key: string) {
    super(`Request for key ${key} is already in progress.`);
  }
}

/**
 * Run `handler` at most once per key, replaying the stored result on a retry.
 *
 * Two properties matter here and both were previously missing:
 *
 * 1. The key is *reserved* before the handler runs, not after. The old shape
 *    was select -> run -> insert, so two concurrent requests both saw "no row"
 *    and both executed the handler; the row only protected the row.
 * 2. Only successful (2xx) results are stored. Caching a failure meant a
 *    transient error pinned that key to an error response for a full day, so
 *    the operation could never succeed later even once the cause was fixed.
 */
export async function withIdempotency(
  key: string,
  handler: () => Promise<StoredResult | unknown>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<StoredResult> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  // Claim the key. statusCode 0 marks "in flight, no result yet".
  const [claimed] = await db
    .insert(idempotencyKeys)
    .values({ key, statusCode: 0, responseBody: "", expiresAt })
    .onConflictDoNothing({ target: idempotencyKeys.key })
    .returning({ key: idempotencyKeys.key });

  if (!claimed) {
    const [existing] = await db
      .select()
      .from(idempotencyKeys)
      .where(eq(idempotencyKeys.key, key))
      .limit(1);

    if (existing && existing.statusCode !== 0 && existing.expiresAt > now) {
      log.info("replaying stored response", { key });
      return {
        statusCode: existing.statusCode,
        body: JSON.parse(existing.responseBody),
      };
    }

    // Either in flight, or a stale/expired row. Try to take it over — the
    // conditional WHERE means only one racer can win the reclaim.
    const staleBefore = new Date(now.getTime() - IN_FLIGHT_GRACE_MS);
    const [reclaimed] = await db
      .update(idempotencyKeys)
      .set({ statusCode: 0, responseBody: "", createdAt: now, expiresAt })
      .where(
        and(
          eq(idempotencyKeys.key, key),
          sql`(${idempotencyKeys.expiresAt} <= ${now}
               OR (${idempotencyKeys.statusCode} = 0 AND ${idempotencyKeys.createdAt} <= ${staleBefore}))`
        )
      )
      .returning({ key: idempotencyKeys.key });

    if (!reclaimed) throw new IdempotencyInFlightError(key);
    log.warn("reclaimed a stale idempotency key", { key });
  }

  let result: StoredResult;
  try {
    const raw = await handler();
    result =
      raw && typeof raw === "object" && "statusCode" in raw && "body" in raw
        ? (raw as StoredResult)
        : { statusCode: 200, body: raw };
  } catch (err) {
    // Release the claim so a retry is possible; the caller still sees the throw.
    await db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, key)).catch(() => {});
    throw err;
  }

  if (result.statusCode >= 200 && result.statusCode < 300) {
    await db
      .update(idempotencyKeys)
      .set({
        statusCode: result.statusCode,
        responseBody: JSON.stringify(result.body),
        expiresAt,
      })
      .where(eq(idempotencyKeys.key, key));
  } else {
    // A failure is not a durable answer — drop the claim so the client can
    // legitimately retry once whatever caused it is resolved.
    await db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, key));
  }

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
