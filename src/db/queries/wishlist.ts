import { db, dbRead } from "@/lib/db";
import { wishlists, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { formatINR } from "@/lib/format";

export async function getWishlistByUserId(userId: number) {
  const rows = await dbRead
    .select({
      id: wishlists.id,
      productId: products.id,
      name: products.name,
      image: products.image,
      priceInr: products.priceInr,
      number: products.number,
    })
    .from(wishlists)
    .innerJoin(products, eq(wishlists.productId, products.id))
    .where(eq(wishlists.userId, userId));

  return rows.map((r) => ({ ...r, price: formatINR(r.priceInr) }));
}

/** Returns the wishlist product ids for a user (lightweight set for client hydration). */
export async function getWishlistProductIds(userId: number) {
  const rows = await dbRead
    .select({ productId: wishlists.productId })
    .from(wishlists)
    .where(eq(wishlists.userId, userId));
  return rows.map((r) => r.productId);
}

export async function addToWishlist(userId: number, productId: number) {
  // ON CONFLICT DO NOTHING — idempotent; safe to call even if already wishlisted.
  await db
    .insert(wishlists)
    .values({ userId, productId })
    .onConflictDoNothing();
}

export async function removeFromWishlist(userId: number, productId: number) {
  await db
    .delete(wishlists)
    .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)));
}
