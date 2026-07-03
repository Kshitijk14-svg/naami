/**
 * One-off backfill: generates a thumbnailImage for every product/collection
 * row that still has one missing (thumbnailImage IS NULL), using the image
 * file already on disk under public/.
 *
 * Idempotent — only touches rows where thumbnailImage is null, safe to re-run.
 *
 * Usage: npx tsx scripts/backfill-thumbnails.ts
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import path from "path";
import { promises as fs } from "fs";

async function main() {
  // Dynamic imports: these modules read process.env at their own top level
  // (db.ts constructs a pg Pool from DATABASE_URL, redis.ts reads Upstash
  // vars), so they must only be evaluated after loadEnvConfig() above has
  // run — a static import would be hoisted ahead of that call.
  const { isNull, eq } = await import("drizzle-orm");
  const { db, pools } = await import("../src/lib/db");
  const { products, collections } = await import("../src/db/schema");
  const { generateThumbnail } = await import("../src/lib/imageProcessing");
  const { redisDel } = await import("../src/lib/redis");
  const { CACHE_KEYS } = await import("../src/lib/cache");

  async function backfillRow(
    table: typeof products | typeof collections,
    row: { id: number; image: string },
    subfolder: "products" | "collections"
  ): Promise<boolean> {
    const sourcePath = path.join(process.cwd(), "public", row.image);
    let sourceBuffer: Buffer;
    try {
      sourceBuffer = await fs.readFile(sourcePath);
    } catch {
      console.warn(`  [skip] id=${row.id}: source file not found at ${sourcePath}`);
      return false;
    }

    const thumbBuffer = await generateThumbnail(sourceBuffer);
    const baseName = path.basename(row.image, path.extname(row.image));
    const thumbName = `${baseName}-thumb.webp`;
    const dir = path.join(process.cwd(), "public", "images", subfolder);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, thumbName), thumbBuffer);

    const thumbnailImage = `/images/${subfolder}/${thumbName}`;
    await db.update(table).set({ thumbnailImage }).where(eq(table.id, row.id));
    console.log(`  [ok] id=${row.id}: ${row.image} -> ${thumbnailImage}`);
    return true;
  }

  console.log("Backfilling product thumbnails...");
  const productRows = await db
    .select({ id: products.id, image: products.image })
    .from(products)
    .where(isNull(products.thumbnailImage));

  let productsUpdated = 0;
  for (const row of productRows) {
    if (await backfillRow(products, row, "products")) productsUpdated++;
  }

  console.log("Backfilling collection thumbnails...");
  const collectionRows = await db
    .select({ id: collections.id, image: collections.image })
    .from(collections)
    .where(isNull(collections.thumbnailImage));

  let collectionsUpdated = 0;
  for (const row of collectionRows) {
    if (await backfillRow(collections, row, "collections")) collectionsUpdated++;
  }

  if (productsUpdated > 0 || collectionsUpdated > 0) {
    await redisDel(
      CACHE_KEYS.PRODUCTS_ALL,
      CACHE_KEYS.PRODUCTS_PUBLISHED,
      CACHE_KEYS.PRODUCTS_NEW_ARRIVALS,
      CACHE_KEYS.PRODUCTS_BESTSELLERS,
      CACHE_KEYS.COLLECTIONS_ALL,
      CACHE_KEYS.COLLECTIONS_HOMEPAGE
    );
  }

  console.log(
    `Done. Products updated: ${productsUpdated}/${productRows.length}. Collections updated: ${collectionsUpdated}/${collectionRows.length}.`
  );

  await pools.primary.end();
  if (pools.replica) await pools.replica.end();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
