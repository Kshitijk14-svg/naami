import {
  getFeaturedNewArrivals,
  getFeaturedBestsellers,
  formatProduct,
  getProductSizesBatch,
} from "@/db/queries/products";
import { getHomepageCollections } from "@/db/queries/collections";

export async function getHomeContent() {
  const [newArrivalRows, bestsellersRows, collectionRows] = await Promise.all([
    getFeaturedNewArrivals(),
    getFeaturedBestsellers(),
    getHomepageCollections(),
  ]);

  const sizesMap = await getProductSizesBatch([
    ...newArrivalRows.map((p) => p.id),
    ...bestsellersRows.map((p) => p.id),
  ]);

  const withSizes = (rows: typeof newArrivalRows) =>
    rows.map((p) => ({ ...formatProduct(p), sizes: sizesMap[p.id] ?? [] }));

  const collections = collectionRows.map(({ number, name, tag, description, image, thumbnailImage }) => ({
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
