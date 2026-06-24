import { db } from "@/lib/db";
import { designSettings } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { redisDel } from "@/lib/redis";

export type DesignSetting = typeof designSettings.$inferSelect;

// Default hero slide configuration seeded on first use
export const DEFAULT_DESIGN_SETTINGS: Record<string, string> = {
  hero_image_1: "/images/hero-1.png",
  hero_image_2: "/images/hero-2.png",
  hero_image_3: "/images/hero-3.png",
  hero_title_1: "OXFORD STRIPE SHIRT",
  hero_title_2: "LINEN NATURAL CAMP",
  hero_title_3: "SASHIKO BORO OVERSHIRT",
  hero_subtitle_1: "120s Egyptian Cotton Oxford",
  hero_subtitle_2: "8oz European Linen",
  hero_subtitle_3: "Hand-stitched Sashiko Weave",
  hero_tag_1: "Naami // AW26 Collection — 001",
  hero_tag_2: "Naami // AW26 Collection — 002",
  hero_tag_3: "Naami // AW26 Collection — 003",
};

export async function getAllDesignSettings(): Promise<Record<string, string>> {
  return getCached(CACHE_KEYS.DESIGN_SETTINGS, CACHE_TTL.DESIGN, async () => {
    const rows = await db.select().from(designSettings);
    const result: Record<string, string> = { ...DEFAULT_DESIGN_SETTINGS };
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  });
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(designSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: designSettings.key,
      set: { value, updatedAt: new Date() },
    });
  await redisDel(CACHE_KEYS.DESIGN_SETTINGS);
}

export async function bulkSetSettings(updates: Record<string, string>): Promise<void> {
  const keys = Object.keys(updates);
  if (keys.length === 0) return;

  // Delete existing rows for the updated keys, then insert fresh
  await db.delete(designSettings).where(inArray(designSettings.key, keys));
  await db.insert(designSettings).values(
    keys.map((key) => ({ key, value: updates[key], updatedAt: new Date() }))
  );
  await redisDel(CACHE_KEYS.DESIGN_SETTINGS);
}
