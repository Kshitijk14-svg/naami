import {
  getFeaturedNewArrivals,
  getFeaturedBestsellers,
  formatProduct,
  getProductSizes,
} from "@/db/queries/products";
import { getHomepageCollections } from "@/db/queries/collections";

export async function GET() {
  const [newArrivalRows, bestsellersRows, collectionRows] = await Promise.all([
    getFeaturedNewArrivals(),
    getFeaturedBestsellers(),
    getHomepageCollections(),
  ]);

  // Attach sizes to every product row
  const withSizes = async (rows: typeof newArrivalRows) =>
    Promise.all(
      rows.map(async (p) => {
        const sizes = await getProductSizes(p.id);
        return { ...formatProduct(p), sizes };
      })
    );

  const [newArrivals, bestsellers] = await Promise.all([
    withSizes(newArrivalRows),
    withSizes(bestsellersRows),
  ]);

  const collections = collectionRows.map(({ number, name, tag, description, image }) => ({
    number,
    name,
    tag,
    description,
    image,
  }));

  return Response.json({ newArrivals, bestsellers, collections });
}
