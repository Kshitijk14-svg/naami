import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getAllProducts,
  createProduct,
  formatProduct,
  setProductSizes,
} from "@/db/queries/products";

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

  const product = await createProduct({
    name: body.name,
    priceInr,
    stock: body.stock,
    isPublished: body.isPublished ?? true,
    isFeaturedNewArrival: body.isFeaturedNewArrival ?? false,
    isFeaturedBestseller: body.isFeaturedBestseller ?? false,
    homeSortOrder: body.homeSortOrder ?? 0,
    number: body.number ?? "",
    subtitle: body.subtitle ?? "",
    material: body.material ?? "",
    fit: body.fit ?? "",
    origin: body.origin ?? "",
    image: body.image ?? "/images/product-jacket.png",
    thumbnailImage: body.thumbnailImage ?? null,
    categoryId: body.categoryId ?? null,
    lowStockThreshold: body.lowStockThreshold ?? 5,
  });

  if (body.sizes && Array.isArray(body.sizes)) {
    await setProductSizes(product.id, body.sizes);
  }

  return Response.json(formatProduct(product), { status: 201 });
}
