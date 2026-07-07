import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getProductById,
  updateProduct,
  deleteProduct,
  formatProduct,
  getProductSizes,
  setProductSizes,
  getProductMetafields,
  setProductMetafields,
  getProductImages,
  setProductImages,
  type ProductMetafield,
  type SetProductImagesInput,
} from "@/db/queries/products";

const MAX_IMAGES = 6;
const PRODUCT_IMAGES_DIR = path.join(process.cwd(), "public", "images", "products");

function validateMetafields(input: unknown): input is ProductMetafield[] {
  if (!Array.isArray(input)) return false;
  return input.every(
    (m) =>
      m &&
      typeof m.name === "string" &&
      m.name.trim().length > 0 &&
      m.name.length <= 100 &&
      typeof m.description === "string"
  );
}

function validateImages(input: unknown): input is SetProductImagesInput[] {
  if (!Array.isArray(input)) return false;
  if (input.length > MAX_IMAGES) return false;
  return input.every((img) => img && typeof img.url === "string" && img.url.length > 0);
}

/** Best-effort delete of a removed image's files, confined to the product upload dir. */
async function unlinkProductImage(url: string | null | undefined) {
  if (!url || !url.startsWith("/images/products/")) return;
  const resolved = path.join(process.cwd(), "public", path.normalize(url));
  if (!resolved.startsWith(PRODUCT_IMAGES_DIR)) return;
  await fs.unlink(resolved).catch(() => {});
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const product = await getProductById(Number(id));
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });

  const [sizes, metafields, images] = await Promise.all([
    getProductSizes(product.id),
    getProductMetafields(product.id),
    getProductImages(product.id),
  ]);
  return Response.json({ ...formatProduct(product), sizes, metafields, images });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();

  if (body.metafields !== undefined && !validateMetafields(body.metafields)) {
    return Response.json(
      { error: "Each metafield needs a non-empty name (max 100 chars) and a description" },
      { status: 400 }
    );
  }
  if (body.images !== undefined && !validateImages(body.images)) {
    return Response.json(
      { error: `A product can have at most ${MAX_IMAGES} images` },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.number !== undefined) updateData.number = body.number;
  if (body.subtitle !== undefined) updateData.subtitle = body.subtitle;
  if (body.stock !== undefined) updateData.stock = body.stock;
  if (body.trackStock !== undefined) updateData.trackStock = body.trackStock;
  if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;
  if (body.isFeaturedNewArrival !== undefined) updateData.isFeaturedNewArrival = body.isFeaturedNewArrival;
  if (body.isFeaturedBestseller !== undefined) updateData.isFeaturedBestseller = body.isFeaturedBestseller;
  if (body.homeSortOrder !== undefined) updateData.homeSortOrder = body.homeSortOrder;
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
  if (body.metafields !== undefined) {
    await setProductMetafields(Number(id), body.metafields);
  }
  if (body.images !== undefined) {
    const removed = await setProductImages(Number(id), body.images);
    await Promise.all(
      removed.flatMap((img) => [unlinkProductImage(img.url), unlinkProductImage(img.thumbnailUrl)])
    );
  }

  const [freshProduct, sizes, metafields, images] = await Promise.all([
    getProductById(Number(id)),
    getProductSizes(Number(id)),
    getProductMetafields(Number(id)),
    getProductImages(Number(id)),
  ]);

  return Response.json({ ...formatProduct(freshProduct ?? updated), sizes, metafields, images });
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
