import { getAllDesignSettings } from "./designSettings";
import { resolveInstagramOembed, type ResolvedReel } from "@/lib/instagramOembed";

export interface InstagramReelsContent {
  enabled: boolean;
  kicker: string;
  title: string;
  reels: ResolvedReel[];
}

export async function getInstagramReelsContent(): Promise<InstagramReelsContent> {
  const settings = await getAllDesignSettings();

  const enabled = settings.instagram_reels_enabled === "true";
  const urls = [1, 2, 3, 4, 5, 6]
    .map((n) => settings[`instagram_reels_url_${n}`]?.trim())
    .filter((url): url is string => Boolean(url));

  const reels = enabled && urls.length > 0
    ? (await Promise.all(urls.map(resolveInstagramOembed))).filter(
        (reel): reel is ResolvedReel => reel !== null
      )
    : [];

  return {
    enabled,
    kicker: settings.instagram_reels_kicker,
    title: settings.instagram_reels_title,
    reels,
  };
}
