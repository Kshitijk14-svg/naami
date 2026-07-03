import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getAllCollections, createCollection, getCollectionProductIds } from "@/db/queries/collections";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const rows = await getAllCollections();
  // Attach productIds for the admin UI (collections table expects this field)
  const collections = await Promise.all(
    rows.map(async (c) => ({
      ...c,
      productIds: await getCollectionProductIds(c.id),
    }))
  );
  return Response.json(collections);
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  if (!body.name || !body.number) {
    return Response.json({ error: "name and number are required" }, { status: 400 });
  }

  const collection = await createCollection({
    number: body.number,
    name: body.name,
    tag: body.tag ?? "",
    description: body.description ?? "",
    image: body.image ?? "/images/product-jacket.png",
    thumbnailImage: body.thumbnailImage,
    productIds: Array.isArray(body.productIds) ? body.productIds : [],
    isPublished: body.isPublished ?? true,
    showOnHomepage: body.showOnHomepage ?? false,
    homeSortOrder: body.homeSortOrder ?? 0,
  });

  const productIds = await getCollectionProductIds(collection.id);
  return Response.json({ ...collection, productIds }, { status: 201 });
}
