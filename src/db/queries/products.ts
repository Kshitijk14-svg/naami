import { db, dbRead } from "@/lib/db";
import { products, productSizes, productMetafields, productImages } from "@/db/schema";
import { eq, and, sql, isNull, asc, inArray } from "drizzle-orm";
import { getCached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { redisDel } from "@/lib/redis";
import { formatINR } from "@/lib/format";
import { enqueueJob } from "@/lib/jobs";

export type ProductRow = typeof products.$inferSelect;
export type ProductMetafield = { name: string; description: string };
export type ProductImage = { url: string; thumbnailUrl: string | null };

/**
 * Admin-only formatting: spreads the full row (stock, thresholds, publish/
 * featured flags, timestamps). Never expose this to public storefront routes
 * — use projectPublicProduct for those.
 */
export function formatProduct(p: ProductRow) {
  return { ...p, price: formatINR(p.priceInr), thumbnailImage: p.thumbnailImage ?? p.image };
}

/** Public storefront shape — deliberately excludes admin-only fields. */
export function projectPublicProduct(
  p: ProductRow,
  extras: { sizes?: string[]; images?: ProductImage[]; metafields?: ProductMetafield[] } = {}
) {
  return {
    id: p.id,
    number: p.number,
    name: p.name,
    subtitle: p.subtitle,
    priceInr: p.priceInr,
    price: formatINR(p.priceInr),
    image: p.image,
    thumbnailImage: p.thumbnailImage ?? p.image,
    categoryId: p.categoryId,
    sizes: extras.sizes ?? [],
    images: extras.images ?? [],
    metafields: extras.metafields ?? [],
  };
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
  const updated = await db.transaction(async (tx) => {
    // Lock the row first so a concurrent edit can't race the threshold check below.
    const [old] = await tx
      .select({
        stock: products.stock,
        lowStockThreshold: products.lowStockThreshold,
        trackStock: products.trackStock,
      })
      .from(products)
      .where(eq(products.id, id))
      .for("update")
      .limit(1);

    const [row] = await tx
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    // Edge-trigger only: alert when this edit newly crosses the threshold
    // (was at/above, now below), not every save that happens to leave stock
    // low — admins can move stock in either direction, unlike order checkout.
    // Skipped entirely for infinite-stock products.
    if (
      row &&
      old &&
      old.trackStock &&
      data.stock !== undefined &&
      row.stock < row.lowStockThreshold &&
      old.stock >= old.lowStockThreshold
    ) {
      await enqueueJob(
        "email:low_stock",
        {
          items: [
            {
              name: row.name,
              number: row.number,
              stock: row.stock,
              lowStockThreshold: row.lowStockThreshold,
            },
          ],
        },
        tx
      );
    }

    return row ?? null;
  });

  if (updated) {
    await redisDel(
      CACHE_KEYS.PRODUCTS_ALL,
      CACHE_KEYS.PRODUCTS_PUBLISHED,
      CACHE_KEYS.PRODUCT_BY_ID(id),
      CACHE_KEYS.PRODUCTS_NEW_ARRIVALS,
      CACHE_KEYS.PRODUCTS_BESTSELLERS
    );
  }
  return updated;
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
          sql`(${products.name} ILIKE ${pattern} OR ${products.subtitle} ILIKE ${pattern} OR EXISTS (
            SELECT 1 FROM ${productMetafields}
            WHERE ${productMetafields.productId} = ${products.id}
              AND (${productMetafields.name} ILIKE ${pattern} OR ${productMetafields.description} ILIKE ${pattern})
          ))`
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

export async function getProductMetafields(productId: number): Promise<ProductMetafield[]> {
  const rows = await dbRead
    .select({ name: productMetafields.name, description: productMetafields.description })
    .from(productMetafields)
    .where(eq(productMetafields.productId, productId))
    .orderBy(asc(productMetafields.sortOrder));
  return rows;
}

export async function getProductMetafieldsBatch(
  productIds: number[]
): Promise<Record<number, ProductMetafield[]>> {
  if (productIds.length === 0) return {};
  const rows = await dbRead
    .select({
      productId: productMetafields.productId,
      name: productMetafields.name,
      description: productMetafields.description,
    })
    .from(productMetafields)
    .where(inArray(productMetafields.productId, productIds))
    .orderBy(asc(productMetafields.sortOrder));

  const result: Record<number, ProductMetafield[]> = {};
  for (const row of rows) {
    (result[row.productId] ??= []).push({ name: row.name, description: row.description });
  }
  return result;
}

/** Mirrors setProductSizes: lock, delete-all, reinsert in array order. */
export async function setProductMetafields(productId: number, metafields: ProductMetafield[]) {
  await db.transaction(async (tx) => {
    await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .for("update")
      .limit(1);

    await tx.delete(productMetafields).where(eq(productMetafields.productId, productId));
    if (metafields.length > 0) {
      await tx.insert(productMetafields).values(
        metafields.map((m, index) => ({
          productId,
          name: m.name,
          description: m.description,
          sortOrder: index,
        }))
      );
    }
  });
  await redisDel(CACHE_KEYS.PRODUCT_BY_ID(productId));
}

export async function getProductImages(productId: number): Promise<ProductImage[]> {
  const rows = await dbRead
    .select({ url: productImages.url, thumbnailUrl: productImages.thumbnailUrl })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder));
  return rows;
}

export async function getProductImagesBatch(
  productIds: number[]
): Promise<Record<number, ProductImage[]>> {
  if (productIds.length === 0) return {};
  const rows = await dbRead
    .select({
      productId: productImages.productId,
      url: productImages.url,
      thumbnailUrl: productImages.thumbnailUrl,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(asc(productImages.sortOrder));

  const result: Record<number, ProductImage[]> = {};
  for (const row of rows) {
    (result[row.productId] ??= []).push({ url: row.url, thumbnailUrl: row.thumbnailUrl });
  }
  return result;
}

export type SetProductImagesInput = { url: string; thumbnailUrl?: string | null; sizeBytes?: number };

const DEFAULT_PRODUCT_IMAGE = "/images/product-jacket.png";

/**
 * Mirrors setProductSizes (lock, delete-all, reinsert), plus keeps the
 * denormalized products.image/thumbnailImage in sync with gallery position 0
 * — those columns are still read by wishlist/search/cart-snapshot/seed code.
 * Returns the images that existed before but not after, so the caller can
 * best-effort unlink their files from disk.
 */
export async function setProductImages(
  productId: number,
  images: SetProductImagesInput[]
): Promise<ProductImage[]> {
  const removed = await db.transaction(async (tx) => {
    await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .for("update")
      .limit(1);

    const before = await tx
      .select({ url: productImages.url, thumbnailUrl: productImages.thumbnailUrl })
      .from(productImages)
      .where(eq(productImages.productId, productId));

    await tx.delete(productImages).where(eq(productImages.productId, productId));
    if (images.length > 0) {
      await tx.insert(productImages).values(
        images.map((img, index) => ({
          productId,
          url: img.url,
          thumbnailUrl: img.thumbnailUrl ?? null,
          sortOrder: index,
          sizeBytes: img.sizeBytes ?? null,
        }))
      );
    }

    const main = images[0];
    await tx
      .update(products)
      .set({
        image: main?.url ?? DEFAULT_PRODUCT_IMAGE,
        thumbnailImage: main?.thumbnailUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    const afterUrls = new Set(images.map((i) => i.url));
    return before.filter((b) => !afterUrls.has(b.url));
  });

  await redisDel(
    CACHE_KEYS.PRODUCTS_ALL,
    CACHE_KEYS.PRODUCTS_PUBLISHED,
    CACHE_KEYS.PRODUCT_BY_ID(productId),
    CACHE_KEYS.PRODUCTS_NEW_ARRIVALS,
    CACHE_KEYS.PRODUCTS_BESTSELLERS
  );
  return removed;
}
