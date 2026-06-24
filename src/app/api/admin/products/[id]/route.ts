import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getProductById,
  updateProduct,
  deleteProduct,
  formatProduct,
  getProductSizes,
  setProductSizes,
} from "@/db/queries/products";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const product = await getProductById(Number(id));
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });

  const sizes = await getProductSizes(product.id);
  return Response.json({ ...formatProduct(product), sizes });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.number !== undefined) updateData.number = body.number;
  if (body.subtitle !== undefined) updateData.subtitle = body.subtitle;
  if (body.material !== undefined) updateData.material = body.material;
  if (body.fit !== undefined) updateData.fit = body.fit;
  if (body.origin !== undefined) updateData.origin = body.origin;
  if (body.image !== undefined) updateData.image = body.image;
  if (body.stock !== undefined) updateData.stock = body.stock;
  if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
  if (body.lowStockThreshold !== undefined) updateData.lowStockThreshold = body.lowStockThreshold;
  // Accept both camelCase variants for price
  const priceInr = body.priceInr ?? body.priceINR;
  if (priceInr !== undefined) updateData.priceInr = priceInr;

  const updated = await updateProduct(Number(id), updateData);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });

  if (body.sizes !== undefined && Array.isArray(body.sizes)) {
    await setProductSizes(Number(id), body.sizes);
  }

  const sizes = await getProductSizes(updated.id);
  return Response.json({ ...formatProduct(updated), sizes });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const deleted = await deleteProduct(Number(id));
  if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
