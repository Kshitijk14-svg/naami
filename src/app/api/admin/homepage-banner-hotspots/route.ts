import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getBannerHotspots,
  replaceBannerHotspots,
  validateHotspots,
  type BannerVariant,
} from "@/db/queries/homepageContent";

const parseVariant = (v: unknown): BannerVariant => (v === "mobile" ? "mobile" : "desktop");

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const variant = parseVariant(request.nextUrl.searchParams.get("variant"));
  const hotspots = await getBannerHotspots(variant);
  return Response.json(hotspots);
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const err = validateHotspots(body.hotspots);
  if (err) return Response.json({ error: err }, { status: 400 });

  const variant = parseVariant(body.variant);
  await replaceBannerHotspots(body.hotspots, variant);
  const hotspots = await getBannerHotspots(variant);
  return Response.json(hotspots);
}
