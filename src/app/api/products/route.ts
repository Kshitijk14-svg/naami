import {
  getPublishedProducts,
  projectPublicProduct,
  getProductSizesBatch,
  getProductImagesBatch,
  getProductMetafieldsBatch,
} from "@/db/queries/products";

export async function GET() {
  const rows = await getPublishedProducts();
  const ids = rows.map((p) => p.id);
  const [sizesMap, imagesMap, metafieldsMap] = await Promise.all([
    getProductSizesBatch(ids),
    getProductImagesBatch(ids),
    getProductMetafieldsBatch(ids),
  ]);
  const products = rows.map((p) =>
    projectPublicProduct(p, {
      sizes: sizesMap[p.id] ?? [],
      images: imagesMap[p.id] ?? [],
      metafields: metafieldsMap[p.id] ?? [],
    })
  );
  return Response.json(products);
}
