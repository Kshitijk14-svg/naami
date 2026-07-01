import { NextRequest } from "next/server";
import { getProductById, formatProduct, getProductSizes } from "@/db/queries/products";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await getProductById(Number(id));

  if (!product || !product.isPublished) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const sizes = await getProductSizes(product.id);
  return Response.json({ ...formatProduct(product), sizes });
}
