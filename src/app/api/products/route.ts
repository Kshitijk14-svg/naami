import { getPublishedProducts, formatProduct, getProductSizes } from "@/db/queries/products";

export async function GET() {
  const rows = await getPublishedProducts();
  const products = await Promise.all(
    rows.map(async (p) => {
      const sizes = await getProductSizes(p.id);
      return { ...formatProduct(p), sizes };
    })
  );
  return Response.json(products);
}
