import { db } from "@/lib/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { redisDel } from "@/lib/redis";

export type CategoryRow = typeof categories.$inferSelect;

export async function getAllCategories() {
  return getCached(CACHE_KEYS.CATEGORIES_ALL, CACHE_TTL.CATEGORIES, () =>
    db.select().from(categories)
  );
}

export async function getCategoryById(id: number) {
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
}) {
  const [category] = await db.insert(categories).values(data).returning();
  await redisDel(CACHE_KEYS.CATEGORIES_ALL);
  return category;
}

export async function updateCategory(
  id: number,
  data: Partial<{ name: string; slug: string; description: string }>
) {
  const [updated] = await db
    .update(categories)
    .set(data)
    .where(eq(categories.id, id))
    .returning();
  if (updated) await redisDel(CACHE_KEYS.CATEGORIES_ALL);
  return updated ?? null;
}

export async function deleteCategory(id: number) {
  const [deleted] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning();
  if (deleted) await redisDel(CACHE_KEYS.CATEGORIES_ALL);
  return !!deleted;
}
