import { db, dbRead } from "@/lib/db";
import { products, productSizes } from "@/db/schema";
import { eq, and, sql, isNull, asc, inArray } from "drizzle-orm";
import { getCached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { redisDel } from "@/lib/redis";
import { formatINR } from "@/lib/format";

export type ProductRow = typeof products.$inferSelect;

/** Formatted price string for the front-end (removes the stored-string transitive dep). */
export function formatProduct(p: ProductRow) {
  return { ...p, price: formatINR(p.priceInr), thumbnailImage: p.thumbnailImage ?? p.image };
}

export async function getAllProducts() {
  return getCached(CACHE_KEYS.PRODUCTS_ALL, CACHE_TTL.PRODUCTS, () =>
    dbRead.select().from(products).where(isNull(products.deletedAt))
  );
}

export async function getPublishedProducts() {
  return getCached(CACHE_KEYS.PRODUCTS_PUBLISHED, CACHE_TTL.PRODUCTS, () =>
    dbRead
      .select()
      .from(products)
      .where(and(eq(products.isPublished, true), isNull(products.deletedAt)))
  );
}

export async function getProductById(id: number) {
  return getCached(CACHE_KEYS.PRODUCT_BY_ID(id), CACHE_TTL.PRODUCTS, async () => {
    const rows = await dbRead
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  });
}

export async function getFeaturedNewArrivals() {
  return getCached(CACHE_KEYS.PRODUCTS_NEW_ARRIVALS, CACHE_TTL.HOME, () =>
    dbRead
      .select()
      .from(products)
      .where(
        and(
          eq(products.isPublished, true),
          eq(products.isFeaturedNewArrival, true),
          isNull(products.deletedAt)
        )
      )
      .orderBy(asc(products.homeSortOrder))
  );
}

export async function getFeaturedBestsellers() {
  return getCached(CACHE_KEYS.PRODUCTS_BESTSELLERS, CACHE_TTL.HOME, () =>
    dbRead
      .select()
      .from(products)
      .where(
        and(
          eq(products.isPublished, true),
          eq(products.isFeaturedBestseller, true),
          isNull(products.deletedAt)
        )
      )
      .orderBy(asc(products.homeSortOrder))
  );
}

export async function createProduct(
  data: Omit<ProductRow, "id" | "createdAt" | "updatedAt" | "deletedAt">
) {
  const [product] = await db.insert(products).values(data).returning();
  await redisDel(
    CACHE_KEYS.PRODUCTS_ALL,
    CACHE_KEYS.PRODUCTS_PUBLISHED,
    CACHE_KEYS.PRODUCTS_NEW_ARRIVALS,
    CACHE_KEYS.PRODUCTS_BESTSELLERS
  );
  return product;
}

export async function updateProduct(
  id: number,
  data: Partial<Omit<ProductRow, "id" | "createdAt" | "updatedAt" | "deletedAt">>
) {
  const [updated] = await db
    .update(products)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  if (updated) {
    await redisDel(
      CACHE_KEYS.PRODUCTS_ALL,
      CACHE_KEYS.PRODUCTS_PUBLISHED,
      CACHE_KEYS.PRODUCT_BY_ID(id),
      CACHE_KEYS.PRODUCTS_NEW_ARRIVALS,
      CACHE_KEYS.PRODUCTS_BESTSELLERS
    );
  }
  return updated ?? null;
}

export async function deleteProduct(id: number) {
  // Soft delete: keep the row (order history references it) but hide it from reads.
  const [deleted] = await db
    .update(products)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .returning();
  if (deleted) {
    await redisDel(
      CACHE_KEYS.PRODUCTS_ALL,
      CACHE_KEYS.PRODUCTS_PUBLISHED,
      CACHE_KEYS.PRODUCT_BY_ID(id),
      CACHE_KEYS.PRODUCTS_NEW_ARRIVALS,
      CACHE_KEYS.PRODUCTS_BESTSELLERS
    );
  }
  return !!deleted;
}

export async function searchProducts(q: string) {
  const lower = q.toLowerCase().trim();
  return getCached(CACHE_KEYS.SEARCH_RESULTS(lower), CACHE_TTL.SEARCH, () => {
    const pattern = `%${lower}%`;
    return dbRead
      .select({
        id: products.id,
        name: products.name,
        subtitle: products.subtitle,
        priceInr: products.priceInr,
        image: products.image,
        thumbnailImage: products.thumbnailImage,
      })
      .from(products)
      .where(
        and(
          eq(products.isPublished, true),
          isNull(products.deletedAt),
          sql`(${products.name} ILIKE ${pattern} OR ${products.subtitle} ILIKE ${pattern} OR ${products.material} ILIKE ${pattern})`
        )
      )
      .limit(6);
  });
}

export async function getProductSizes(productId: number) {
  const rows = await dbRead
    .select({ size: productSizes.size })
    .from(productSizes)
    .where(eq(productSizes.productId, productId));
  return rows.map((r) => r.size);
}

export async function getProductSizesBatch(productIds: number[]): Promise<Record<number, string[]>> {
  if (productIds.length === 0) return {};
  const rows = await dbRead
    .select({ productId: productSizes.productId, size: productSizes.size })
    .from(productSizes)
    .where(inArray(productSizes.productId, productIds));

  const result: Record<number, string[]> = {};
  for (const row of rows) {
    (result[row.productId] ??= []).push(row.size);
  }
  return result;
}

export async function setProductSizes(productId: number, sizes: string[]) {
  // Wrap in a transaction and lock the product row first so two concurrent
  // calls for the same product can't interleave their DELETE + INSERT, which
  // would leave duplicate or missing sizes.
  await db.transaction(async (tx) => {
    await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .for("update")
      .limit(1);

    await tx.delete(productSizes).where(eq(productSizes.productId, productId));
    if (sizes.length > 0) {
      await tx
        .insert(productSizes)
        .values(sizes.map((size) => ({ productId, size })));
    }
  });
}
