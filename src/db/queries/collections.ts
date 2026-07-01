import { db, dbRead } from "@/lib/db";
import { collections, collectionProducts } from "@/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { getCached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { redisDel } from "@/lib/redis";

export type CollectionRow = typeof collections.$inferSelect;

export async function getAllCollections() {
  return getCached(CACHE_KEYS.COLLECTIONS_ALL, CACHE_TTL.COLLECTIONS, () =>
    dbRead.select().from(collections).where(isNull(collections.deletedAt))
  );
}

export async function getHomepageCollections() {
  return getCached(CACHE_KEYS.COLLECTIONS_HOMEPAGE, CACHE_TTL.COLLECTIONS, () =>
    dbRead
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.isPublished, true),
          eq(collections.showOnHomepage, true),
          isNull(collections.deletedAt)
        )
      )
      .orderBy(asc(collections.homeSortOrder))
      .limit(3)
  );
}

export async function getCollectionById(id: number) {
  return getCached(
    CACHE_KEYS.COLLECTION_BY_ID(id),
    CACHE_TTL.COLLECTIONS,
    async () => {
      const rows = await dbRead
        .select()
        .from(collections)
        .where(and(eq(collections.id, id), isNull(collections.deletedAt)))
        .limit(1);
      return rows[0] ?? null;
    }
  );
}

export async function createCollection(data: {
  number: string;
  name: string;
  tag?: string;
  description?: string;
  image?: string;
  isPublished?: boolean;
  showOnHomepage?: boolean;
  homeSortOrder?: number;
  productIds?: number[];
}) {
  const { productIds, ...collectionData } = data;
  const [collection] = await db
    .insert(collections)
    .values({
      number: collectionData.number,
      name: collectionData.name,
      tag: collectionData.tag ?? "",
      description: collectionData.description ?? "",
      image: collectionData.image ?? "/images/product-jacket.png",
      isPublished: collectionData.isPublished ?? true,
      showOnHomepage: collectionData.showOnHomepage ?? false,
      homeSortOrder: collectionData.homeSortOrder ?? 0,
    })
    .returning();

  if (productIds && productIds.length > 0) {
    await db.insert(collectionProducts).values(
      productIds.map((productId) => ({
        collectionId: collection.id,
        productId,
      }))
    );
  }

  await redisDel(CACHE_KEYS.COLLECTIONS_ALL, CACHE_KEYS.COLLECTIONS_HOMEPAGE);
  return collection;
}

export async function updateCollection(
  id: number,
  data: Partial<{
    number: string;
    name: string;
    tag: string;
    description: string;
    image: string;
    isPublished: boolean;
    showOnHomepage: boolean;
    homeSortOrder: number;
    productIds: number[];
  }>
) {
  const { productIds, ...collectionData } = data;

  const [updated] = await db
    .update(collections)
    .set({ ...collectionData, updatedAt: new Date() })
    .where(eq(collections.id, id))
    .returning();

  if (!updated) return null;

  if (productIds !== undefined) {
    await db
      .delete(collectionProducts)
      .where(eq(collectionProducts.collectionId, id));
    if (productIds.length > 0) {
      await db
        .insert(collectionProducts)
        .values(productIds.map((productId) => ({ collectionId: id, productId })));
    }
  }

  await redisDel(
    CACHE_KEYS.COLLECTIONS_ALL,
    CACHE_KEYS.COLLECTIONS_HOMEPAGE,
    CACHE_KEYS.COLLECTION_BY_ID(id)
  );
  return updated;
}

export async function deleteCollection(id: number) {
  const [deleted] = await db
    .update(collections)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(collections.id, id), isNull(collections.deletedAt)))
    .returning();
  if (deleted) {
    await redisDel(
      CACHE_KEYS.COLLECTIONS_ALL,
      CACHE_KEYS.COLLECTIONS_HOMEPAGE,
      CACHE_KEYS.COLLECTION_BY_ID(id)
    );
  }
  return !!deleted;
}

export async function getCollectionProductIds(collectionId: number) {
  const rows = await dbRead
    .select({ productId: collectionProducts.productId })
    .from(collectionProducts)
    .where(eq(collectionProducts.collectionId, collectionId));
  return rows.map((r) => r.productId);
}
