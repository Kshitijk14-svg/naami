import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { updateSharedMomentVideo, deleteSharedMomentVideo } from "@/db/queries/homepageContent";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl;
  if (body.thumbnailImage !== undefined) updateData.thumbnailImage = body.thumbnailImage;
  if (body.caption !== undefined) updateData.caption = body.caption;
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

  const updated = await updateSharedMomentVideo(Number(id), updateData);
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
  const deleted = await deleteSharedMomentVideo(Number(id));
  if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
