import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { updateLookCard, deleteLookCard, validateHotspots } from "@/db/queries/homepageContent";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.subtitle !== undefined) updateData.subtitle = body.subtitle;
  if (body.image !== undefined) updateData.image = body.image;
  if (body.thumbnailImage !== undefined) updateData.thumbnailImage = body.thumbnailImage;
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
  if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;
  if (body.hotspots !== undefined) {
    const err = validateHotspots(body.hotspots);
    if (err) return Response.json({ error: err }, { status: 400 });
    updateData.hotspots = body.hotspots;
  }

  const updated = await updateLookCard(Number(id), updateData);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const deleted = await deleteLookCard(Number(id));
  if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
