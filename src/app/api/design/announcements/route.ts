import { getAllDesignSettings } from "@/db/queries/designSettings";

// Must reflect an admin save on the next page load; Redis (busted on save) is
// the caching layer, so no HTTP-level caching here.
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getAllDesignSettings();
  const slots = [1, 2]
    .map((n) => ({
      enabled: settings[`announcement_${n}_enabled`] === "true",
      text: settings[`announcement_${n}_text`] ?? "",
      link: settings[`announcement_${n}_link`] || null,
    }))
    .filter((slot) => slot.enabled && slot.text.trim().length > 0);

  return Response.json(
    { slots },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
