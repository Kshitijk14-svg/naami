import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getCollectionById,
  updateCollection,
  deleteCollection,
  getCollectionProductIds,
} from "@/db/queries/collections";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const collection = await getCollectionById(Number(id));
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });

  const productIds = await getCollectionProductIds(collection.id);
  return Response.json({ ...collection, productIds });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();

  const updated = await updateCollection(Number(id), {
    number: body.number,
    name: body.name,
    tag: body.tag,
    description: body.description,
    image: body.image,
    isPublished: body.isPublished,
    showOnHomepage: body.showOnHomepage,
    homeSortOrder: body.homeSortOrder,
    productIds: Array.isArray(body.productIds) ? body.productIds : undefined,
  });
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });

  const productIds = await getCollectionProductIds(updated.id);
  return Response.json({ ...updated, productIds });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const deleted = await deleteCollection(Number(id));
  if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
