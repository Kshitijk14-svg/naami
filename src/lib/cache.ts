import { redisGet, redisSet } from "./redis";

/**
 * Try Redis first. On any miss or quota error (redisGet returns null),
 * run the DB fallback, then fire-and-forget a cache write so the response
 * is never delayed waiting for Redis.
 */
export async function getCached<T>(
  key: string,
  ttl: number,
  fallback: () => Promise<T>
): Promise<T> {
  const cached = await redisGet<T>(key);
  if (cached !== null) return cached;

  const fresh = await fallback();
  redisSet(key, fresh, ttl).catch((err) =>
    console.error("[cache] Redis write failed:", err)
  );
  return fresh;
}

// ─── Cache key constants ───────────────────────────────────────────────────────

export const CACHE_KEYS = {
  PRODUCTS_ALL: "products:all",
  PRODUCTS_PUBLISHED: "products:published",
  PRODUCT_BY_ID: (id: number) => `products:${id}`,
  CATEGORIES_ALL: "categories:all",
  COLLECTIONS_ALL: "collections:all",
  COLLECTION_BY_ID: (id: number) => `collections:${id}`,
  SEARCH_RESULTS: (q: string) => `search:${q.toLowerCase().trim()}`,
} as const;

// ─── Cache TTLs (seconds) ──────────────────────────────────────────────────────

export const CACHE_TTL = {
  PRODUCTS: 300,
  CATEGORIES: 600,
  COLLECTIONS: 600,
  SEARCH: 60,
} as const;
