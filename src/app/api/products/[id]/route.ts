import { NextRequest } from "next/server";
import {
  getProductById,
  projectPublicProduct,
  getProductSizes,
  getProductImages,
  getProductMetafields,
} from "@/db/queries/products";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await getProductById(Number(id));

  if (!product || !product.isPublished) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const [sizes, images, metafields] = await Promise.all([
    getProductSizes(product.id),
    getProductImages(product.id),
    getProductMetafields(product.id),
  ]);
  return Response.json(projectPublicProduct(product, { sizes, images, metafields }));
}
