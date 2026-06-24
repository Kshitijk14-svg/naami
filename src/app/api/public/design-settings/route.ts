import { getAllDesignSettings } from "@/db/queries/designSettings";

// Public endpoint — no auth required; cached in Redis with 1-hour TTL
export async function GET() {
  const settings = await getAllDesignSettings();
  return Response.json(settings, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
  });
}
