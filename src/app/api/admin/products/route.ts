import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getAllProducts,
  createProduct,
  getProductById,
  formatProduct,
  setProductSizes,
  setProductMetafields,
  setProductImages,
  getProductSizes,
  getProductMetafields,
  getProductImages,
  type ProductMetafield,
  type SetProductImagesInput,
} from "@/db/queries/products";

const MAX_IMAGES = 6;

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

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const all = await getAllProducts();
  return Response.json(all.map(formatProduct));
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const priceInr: number = body.priceINR ?? body.priceInr;

  if (!body.name || typeof priceInr !== "number" || typeof body.stock !== "number") {
    return Response.json({ error: "name, priceINR, and stock are required" }, { status: 400 });
  }
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

  const product = await createProduct({
    name: body.name,
    priceInr,
    stock: body.stock,
    trackStock: body.trackStock ?? true,
    isPublished: body.isPublished ?? true,
    isFeaturedNewArrival: body.isFeaturedNewArrival ?? false,
    isFeaturedBestseller: body.isFeaturedBestseller ?? false,
    homeSortOrder: body.homeSortOrder ?? 0,
    number: body.number ?? "",
    subtitle: body.subtitle ?? "",
    image: body.image ?? "/images/product-jacket.png",
    thumbnailImage: body.thumbnailImage ?? null,
    categoryId: body.categoryId ?? null,
    lowStockThreshold: body.lowStockThreshold ?? 5,
  });

  if (body.sizes && Array.isArray(body.sizes)) {
    await setProductSizes(product.id, body.sizes);
  }
  if (body.metafields !== undefined) {
    await setProductMetafields(product.id, body.metafields);
  }
  if (body.images !== undefined) {
    await setProductImages(product.id, body.images);
  }

  const [freshProduct, sizes, metafields, images] = await Promise.all([
    getProductById(product.id),
    getProductSizes(product.id),
    getProductMetafields(product.id),
    getProductImages(product.id),
  ]);

  return Response.json(
    { ...formatProduct(freshProduct ?? product), sizes, metafields, images },
    { status: 201 }
  );
}
