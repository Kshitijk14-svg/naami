import { getAllDesignSettings } from "@/db/queries/designSettings";
import { PAGE_CONTENT_KEYS } from "@/lib/pageContentDefaults";

// Feeds editable copy to client components (About client, footer, cart,
// checkout, profile, order confirmation, collection, product). Must reflect an
// admin save on the next page load; Redis (busted on save) is the caching
// layer, so no HTTP-level caching here.
export const dynamic = "force-dynamic";

export async function GET() {
  const all = await getAllDesignSettings();
  const keys = new Set(PAGE_CONTENT_KEYS);
  const subset: Record<string, string> = {};
  for (const [key, value] of Object.entries(all)) {
    if (keys.has(key)) subset[key] = value;
  }

  return Response.json(subset, { headers: { "Cache-Control": "no-store" } });
}
