import { getPublishedProducts, formatProduct, getProductSizesBatch } from "@/db/queries/products";

export async function GET() {
  const rows = await getPublishedProducts();
  const sizesMap = await getProductSizesBatch(rows.map((p) => p.id));
  const products = rows.map((p) => ({ ...formatProduct(p), sizes: sizesMap[p.id] ?? [] }));
  return Response.json(products);
}
