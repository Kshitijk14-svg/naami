import { db, dbRead } from "@/lib/db";
import { homepageLookCards, homepageHotspots, products } from "@/db/schema";
import { eq, and, isNull, inArray, asc } from "drizzle-orm";
import { getCached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { redisDel } from "@/lib/redis";

export type LookCardRow = typeof homepageLookCards.$inferSelect;

interface HotspotInput {
  productId: number | null;
  topPct: number;
  leftPct: number;
  sortOrder?: number;
}

interface ResolvedHotspot {
  id: number;
  topPct: number;
  leftPct: number;
  product: { id: number; name: string; priceInr: number; image: string } | null;
}

/** Validates hotspot rows from an admin request body. Returns an error message, or null if valid. */
export function validateHotspots(hotspots: unknown): string | null {
  if (!Array.isArray(hotspots)) return "hotspots must be an array";
  for (const h of hotspots) {
    if (typeof h !== "object" || h === null) return "each hotspot must be an object";
    const { productId, topPct, leftPct } = h as Record<string, unknown>;
    if (productId !== null && typeof productId !== "number") {
      return "hotspot productId must be a number or null";
    }
    if (!Number.isInteger(topPct) || (topPct as number) < 0 || (topPct as number) > 100) {
      return "hotspot topPct must be an integer between 0 and 100";
    }
    if (!Number.isInteger(leftPct) || (leftPct as number) < 0 || (leftPct as number) > 100) {
      return "hotspot leftPct must be an integer between 0 and 100";
    }
  }
  return null;
}

function resolveRow(r: {
  id: number;
  topPct: number;
  leftPct: number;
  productId: number | null;
  productName: string | null;
  productPriceInr: number | null;
  productImage: string | null;
}): ResolvedHotspot {
  return {
    id: r.id,
    topPct: r.topPct,
    leftPct: r.leftPct,
    product:
      r.productId !== null
        ? { id: r.productId, name: r.productName!, priceInr: r.productPriceInr!, image: r.productImage! }
        : null,
  };
}

async function resolveHotspots(lookCardId: number | null): Promise<ResolvedHotspot[]> {
  const rows = await dbRead
    .select({
      id: homepageHotspots.id,
      topPct: homepageHotspots.topPct,
      leftPct: homepageHotspots.leftPct,
      productId: products.id,
      productName: products.name,
      productPriceInr: products.priceInr,
      productImage: products.image,
    })
    .from(homepageHotspots)
    .leftJoin(products, eq(homepageHotspots.productId, products.id))
    .where(
      lookCardId === null
        ? isNull(homepageHotspots.lookCardId)
        : eq(homepageHotspots.lookCardId, lookCardId)
    )
    .orderBy(asc(homepageHotspots.sortOrder));

  return rows.map(resolveRow);
}

/** Batched equivalent of resolveHotspots(cardId) for many cards in one query — avoids N+1. */
async function resolveHotspotsBatch(lookCardIds: number[]): Promise<Record<number, ResolvedHotspot[]>> {
  if (lookCardIds.length === 0) return {};

  const rows = await dbRead
    .select({
      id: homepageHotspots.id,
      lookCardId: homepageHotspots.lookCardId,
      topPct: homepageHotspots.topPct,
      leftPct: homepageHotspots.leftPct,
      productId: products.id,
      productName: products.name,
      productPriceInr: products.priceInr,
      productImage: products.image,
    })
    .from(homepageHotspots)
    .leftJoin(products, eq(homepageHotspots.productId, products.id))
    .where(inArray(homepageHotspots.lookCardId, lookCardIds))
    .orderBy(asc(homepageHotspots.sortOrder));

  const result: Record<number, ResolvedHotspot[]> = {};
  for (const row of rows) {
    (result[row.lookCardId!] ??= []).push(resolveRow(row));
  }
  return result;
}

async function replaceHotspots(lookCardId: number | null, hotspots: HotspotInput[]) {
  await db.transaction(async (tx) => {
    await tx
      .delete(homepageHotspots)
      .where(
        lookCardId === null
          ? isNull(homepageHotspots.lookCardId)
          : eq(homepageHotspots.lookCardId, lookCardId)
      );
    if (hotspots.length > 0) {
      await tx.insert(homepageHotspots).values(
        hotspots.map((h, idx) => ({
          lookCardId,
          productId: h.productId,
          topPct: h.topPct,
          leftPct: h.leftPct,
          sortOrder: h.sortOrder ?? idx,
        }))
      );
    }
  });
}

export async function getAllLookCardsWithHotspots() {
  return getCached(CACHE_KEYS.HOMEPAGE_LOOK_CARDS, CACHE_TTL.HOME, async () => {
    const cards = await dbRead
      .select()
      .from(homepageLookCards)
      .where(isNull(homepageLookCards.deletedAt))
      .orderBy(asc(homepageLookCards.sortOrder));

    const hotspotsByCard = await resolveHotspotsBatch(cards.map((c) => c.id));
    return cards.map((card) => ({ ...card, hotspots: hotspotsByCard[card.id] ?? [] }));
  });
}

export async function getPublishedLookCardsWithHotspots() {
  return getCached(CACHE_KEYS.HOMEPAGE_LOOK_CARDS_PUBLISHED, CACHE_TTL.HOME, async () => {
    const cards = await dbRead
      .select()
      .from(homepageLookCards)
      .where(and(eq(homepageLookCards.isPublished, true), isNull(homepageLookCards.deletedAt)))
      .orderBy(asc(homepageLookCards.sortOrder));

    const hotspotsByCard = await resolveHotspotsBatch(cards.map((c) => c.id));
    return cards.map((card) => ({ ...card, hotspots: hotspotsByCard[card.id] ?? [] }));
  });
}

export async function createLookCard(data: {
  title: string;
  subtitle?: string;
  image?: string;
  thumbnailImage?: string;
  sortOrder?: number;
  isPublished?: boolean;
  hotspots?: HotspotInput[];
}) {
  const { hotspots, ...cardData } = data;
  const [card] = await db
    .insert(homepageLookCards)
    .values({
      title: cardData.title,
      subtitle: cardData.subtitle ?? "",
      image: cardData.image ?? "/images/product-jacket.png",
      thumbnailImage: cardData.thumbnailImage,
      sortOrder: cardData.sortOrder ?? 0,
      isPublished: cardData.isPublished ?? true,
    })
    .returning();

  if (hotspots && hotspots.length > 0) {
    await replaceHotspots(card.id, hotspots);
  }

  await redisDel(CACHE_KEYS.HOMEPAGE_LOOK_CARDS, CACHE_KEYS.HOMEPAGE_LOOK_CARDS_PUBLISHED);
  return card;
}

export async function updateLookCard(
  id: number,
  data: Partial<{
    title: string;
    subtitle: string;
    image: string;
    thumbnailImage: string;
    sortOrder: number;
    isPublished: boolean;
    hotspots: HotspotInput[];
  }>
) {
  const { hotspots, ...cardData } = data;

  const [updated] = await db
    .update(homepageLookCards)
    .set({ ...cardData, updatedAt: new Date() })
    .where(eq(homepageLookCards.id, id))
    .returning();

  if (!updated) return null;

  if (hotspots !== undefined) {
    await replaceHotspots(id, hotspots);
  }

  await redisDel(CACHE_KEYS.HOMEPAGE_LOOK_CARDS, CACHE_KEYS.HOMEPAGE_LOOK_CARDS_PUBLISHED);
  return updated;
}

export async function deleteLookCard(id: number) {
  const [deleted] = await db
    .update(homepageLookCards)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(homepageLookCards.id, id), isNull(homepageLookCards.deletedAt)))
    .returning();
  if (deleted) {
    await redisDel(CACHE_KEYS.HOMEPAGE_LOOK_CARDS, CACHE_KEYS.HOMEPAGE_LOOK_CARDS_PUBLISHED);
  }
  return !!deleted;
}

export async function getBannerHotspots() {
  return getCached(CACHE_KEYS.HOMEPAGE_BANNER_HOTSPOTS, CACHE_TTL.HOME, () => resolveHotspots(null));
}

export async function replaceBannerHotspots(hotspots: HotspotInput[]) {
  await replaceHotspots(null, hotspots);
  await redisDel(CACHE_KEYS.HOMEPAGE_BANNER_HOTSPOTS);
}

export async function getHomepageExtras() {
  const [lookCards, bannerHotspots] = await Promise.all([
    getPublishedLookCardsWithHotspots(),
    getBannerHotspots(),
  ]);
  return { lookCards, bannerHotspots };
}
