import { NextRequest } from "next/server";
import { getCollectionById, getCollectionProductIds } from "@/db/queries/collections";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const collection = await getCollectionById(Number(id));

  if (!collection || !collection.isPublished) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const productIds = await getCollectionProductIds(collection.id);

  return Response.json({
    id: collection.id,
    name: collection.name,
    tag: collection.tag,
    description: collection.description,
    productIds,
  });
}
