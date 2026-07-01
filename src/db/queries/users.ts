import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { ROLE_ASSIGNMENTS } from "@/models/roles";

export type UserRow = typeof users.$inferSelect;

// Auth reads run against the PRIMARY (not the replica): a just-changed password
// or role must be visible immediately, and a soft-deleted (deactivated) account
// must never authenticate.
export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email.toLowerCase().trim()), isNull(users.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getOrCreateUser(
  email: string,
  name?: string | null
): Promise<UserRow> {
  const normalized = email.toLowerCase().trim();

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const role = ROLE_ASSIGNMENTS[normalized] ?? "customer";
  const [created] = await db
    .insert(users)
    .values({ email: normalized, name: name ?? null, role })
    .returning();
  return created;
}

/**
 * Create the account if missing, otherwise update its password (and fill in the
 * name if it was never set). Used by the OTP-verified signup and password-reset
 * flows — both end with a freshly hashed password on the row.
 */
export async function upsertUserWithPassword(
  email: string,
  passwordHash: string,
  name?: string | null
): Promise<UserRow> {
  const normalized = email.toLowerCase().trim();

  const existing = await getUserByEmail(normalized);
  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        passwordHash,
        // Only backfill name when the account doesn't already have one.
        name: existing.name ?? name ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.email, normalized))
      .returning();
    return updated;
  }

  const role = ROLE_ASSIGNMENTS[normalized] ?? "customer";
  const [created] = await db
    .insert(users)
    .values({ email: normalized, name: name ?? null, passwordHash, role })
    .returning();
  return created;
}
