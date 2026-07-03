import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getAllLookCardsWithHotspots, createLookCard, validateHotspots } from "@/db/queries/homepageContent";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const cards = await getAllLookCardsWithHotspots();
  return Response.json(cards);
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  if (!body.title) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  if (body.hotspots !== undefined) {
    const err = validateHotspots(body.hotspots);
    if (err) return Response.json({ error: err }, { status: 400 });
  }

  const card = await createLookCard({
    title: body.title,
    subtitle: body.subtitle,
    image: body.image,
    thumbnailImage: body.thumbnailImage,
    sortOrder: body.sortOrder,
    isPublished: body.isPublished,
    hotspots: Array.isArray(body.hotspots) ? body.hotspots : [],
  });

  return Response.json(card, { status: 201 });
}
