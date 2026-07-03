import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getBannerHotspots, replaceBannerHotspots, validateHotspots } from "@/db/queries/homepageContent";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const hotspots = await getBannerHotspots();
  return Response.json(hotspots);
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const err = validateHotspots(body.hotspots);
  if (err) return Response.json({ error: err }, { status: 400 });

  await replaceBannerHotspots(body.hotspots);
  const hotspots = await getBannerHotspots();
  return Response.json(hotspots);
}
