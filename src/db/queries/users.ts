import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ROLE_ASSIGNMENTS } from "@/models/roles";

export type UserRow = typeof users.$inferSelect;

export async function getOrCreateUser(
  email: string,
  name?: string
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

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  return rows[0] ?? null;
}
