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
  lookbook_banner_image: "/images/campaign-new.png",
  lookbook_banner_label: "NAAMI // INTERACTIVE LOOKBOOK",

  loom_panel1_image: "/images/hero-2.png",
  loom_panel1_kicker: "Albini Heritage // Stage 01",
  loom_panel1_title: "The Weave & The Count",
  loom_panel1_body:
    "Before it is a shirt, it is raw thread count. We weave 100-count to 140-count Egyptian long-staple cotton yarns into tight poplin and Oxford constructions, tensioned to hold their structure through decades of wearing and washing.",
  loom_panel2_image: "/images/campaign-new.png",
  loom_panel2_kicker: "Heritage Craft // Stage 02",
  loom_panel2_title: "The Cutting Table",
  loom_panel2_body:
    "Each shirt panel is hand-cut from a single length of cloth on a long table by a single artisan. Pattern pieces are aligned with the grain of the fabric to ensure the finished shirt hangs perfectly and the check patterns align at every seam.",
  loom_panel3_kicker: "Heritage Craft // Stage 03",
  loom_panel3_title: "The Finishing Hand",
  loom_panel3_body:
    "Each shirt passes through the hands of a finishing specialist who steams the placket flat, presses the collar roll with a curved iron, and attaches the mother-of-pearl buttons by hand. This final stage cannot be mechanised.",

  coinpocket_kicker: "NAAMI // TECHNICAL ARCHIVE",
  coinpocket_title: "The Hidden",
  coinpocket_title_accent: "Button Detail",
  coinpocket_description:
    "True luxury is discrete. We build features that reward discovery. Pull down the fabric loop to extract the hand-stitched origin card directly from our atelier in Lisbon.",
  coinpocket_spec1_label: "Fabric Source",
  coinpocket_spec1_value: "Albini, Bergamo",
  coinpocket_spec2_label: "Button Source",
  coinpocket_spec2_value: "Philippines, shell nacre",
  coinpocket_spec3_label: "Thread Count",
  coinpocket_spec3_value: "120s Egyptian cotton",
  coinpocket_spec4_label: "Seam Type",
  coinpocket_spec4_value: "Double-needle felled",
  coinpocket_spec5_label: "Construction",
  coinpocket_spec5_value: "Hand-finished Lisbon",
  coinpocket_serial_code: "NM-9828-AW",
  coinpocket_season_tag: "AW26",

  manifesto_image: "/images/campaign.jpg",
  manifesto_kicker: "The Philosophy",
  manifesto_quote:
    "True luxury is found in the fall of a collar and the quiet confidence of a perfectly pressed placket. We build refinement for the modern gentleman.",
  manifesto_attribution: "— The Atelier Philosophy",
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
