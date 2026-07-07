import { getAllDesignSettings } from "@/db/queries/designSettings";
import { parseDoodle } from "@/lib/doodle";

// Must reflect an admin save on the next page load; Redis (busted on save) is
// the caching layer, so no HTTP-level caching here.
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getAllDesignSettings();
  const doodle =
    settings.footer_doodle_enabled === "true"
      ? parseDoodle(settings.footer_doodle_data ?? "")
      : null;
  return Response.json(
    { doodle },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
