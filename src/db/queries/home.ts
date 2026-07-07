import {
  getFeaturedNewArrivals,
  getFeaturedBestsellers,
  projectPublicProduct,
  getProductSizesBatch,
  getProductImagesBatch,
  getProductMetafieldsBatch,
} from "@/db/queries/products";
import { getHomepageCollections } from "@/db/queries/collections";

export async function getHomeContent() {
  const [newArrivalRows, bestsellersRows, collectionRows] = await Promise.all([
    getFeaturedNewArrivals(),
    getFeaturedBestsellers(),
    getHomepageCollections(),
  ]);

  const allIds = [...newArrivalRows.map((p) => p.id), ...bestsellersRows.map((p) => p.id)];
  const [sizesMap, imagesMap, metafieldsMap] = await Promise.all([
    getProductSizesBatch(allIds),
    getProductImagesBatch(allIds),
    getProductMetafieldsBatch(allIds),
  ]);

  const withSizes = (rows: typeof newArrivalRows) =>
    rows.map((p) =>
      projectPublicProduct(p, {
        sizes: sizesMap[p.id] ?? [],
        images: imagesMap[p.id] ?? [],
        metafields: metafieldsMap[p.id] ?? [],
      })
    );

  const collections = collectionRows.map(({ id, number, name, tag, description, image, thumbnailImage }) => ({
    id,
    number,
    name,
    tag,
    description,
    image,
    thumbnailImage: thumbnailImage ?? image,
  }));

  return {
    newArrivals: withSizes(newArrivalRows),
    bestsellers: withSizes(bestsellersRows),
    collections,
  };
}
