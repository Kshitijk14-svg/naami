import { createLogger } from "./logger";
import { getCached, CACHE_KEYS, CACHE_TTL } from "./cache";

const log = createLogger("instagram-oembed");

export interface ResolvedReel {
  thumbnailUrl: string;
  authorName: string;
  title: string;
  permalink: string;
}

/**
 * Resolves a single Instagram Reel/post URL to display metadata via the
 * Graph API oEmbed endpoint. Returns null on any failure (missing app
 * credentials, invalid URL, API error) so one bad admin-pasted link can
 * never break the homepage render. Results are cached since Instagram's
 * oEmbed rate limits are tight and thumbnails rarely change.
 */
export async function resolveInstagramOembed(url: string): Promise<ResolvedReel | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  return getCached(CACHE_KEYS.INSTAGRAM_OEMBED(trimmed), CACHE_TTL.INSTAGRAM, () =>
    fetchInstagramOembed(trimmed)
  );
}

async function fetchInstagramOembed(url: string): Promise<ResolvedReel | null> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return null;

  try {
    const endpoint = new URL("https://graph.facebook.com/v19.0/instagram_oembed");
    endpoint.searchParams.set("url", url.trim());
    endpoint.searchParams.set("access_token", `${appId}|${appSecret}`);
    endpoint.searchParams.set("fields", "thumbnail_url,author_name,title");

    const res = await fetch(endpoint.toString());
    if (!res.ok) {
      log.warn("oembed request failed", { url, status: res.status });
      return null;
    }

    const data = await res.json();
    if (!data.thumbnail_url) {
      log.warn("oembed response missing thumbnail_url", { url });
      return null;
    }

    return {
      thumbnailUrl: data.thumbnail_url,
      authorName: data.author_name ?? "",
      title: data.title ?? "",
      permalink: url.trim(),
    };
  } catch (err) {
    log.warn("oembed request threw", { url, err });
    return null;
  }
}
