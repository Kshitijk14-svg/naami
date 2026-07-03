import { db, dbRead } from "@/lib/db";
import { abandonedCarts } from "@/db/schema";
import { and, eq, isNull, lt } from "drizzle-orm";
import { enqueueJob } from "@/lib/jobs";
import { createLogger } from "@/lib/logger";

const log = createLogger("abandoned-carts");

/**
 * Scan for carts that have gone quiet (no checkout activity for
 * `olderThanHours`) and haven't been reminded yet, then enqueue one
 * abandoned-cart email per cart via the transactional outbox.
 *
 * Claim-then-enqueue per cart, inside its own `db.transaction`: the claim is
 * an atomic conditional UPDATE (`reminder_sent_at IS NULL` in the WHERE
 * clause, `RETURNING *`), so concurrent worker runs can never double-claim —
 * and thus never double-email — the same row. The claim always happens
 * first; a cart with an empty item snapshot is still claimed (so it isn't
 * rescanned forever) but no job is enqueued for it.
 *
 * Uses `updatedAt`, not `createdAt`, as the cutoff — create-order re-touches
 * the row on every checkout re-entry, so `createdAt` would email shoppers
 * who are still actively checking out.
 */
export async function enqueueDueCartReminders(olderThanHours: number): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

  const due = await dbRead
    .select({ id: abandonedCarts.id })
    .from(abandonedCarts)
    .where(and(isNull(abandonedCarts.reminderSentAt), lt(abandonedCarts.updatedAt, cutoff)))
    .limit(50);

  let enqueued = 0;

  for (const { id } of due) {
    await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(abandonedCarts)
        .set({ reminderSentAt: new Date() })
        .where(and(eq(abandonedCarts.id, id), isNull(abandonedCarts.reminderSentAt)))
        .returning();

      // No row returned means a concurrent run already claimed it — skip.
      if (!claimed) return;

      const items = JSON.parse(claimed.items);
      if (!Array.isArray(items) || items.length === 0) return;

      await enqueueJob("email:abandoned_cart", { to: claimed.email, items }, tx);
      enqueued++;
    });
  }

  if (enqueued) log.info("enqueued abandoned cart reminders", { enqueued });

  return enqueued;
}
