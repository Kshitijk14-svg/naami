import { getAllCollections, getCollectionProductIds } from "@/db/queries/collections";

// Public list of published collections, used to drive the collection page's
// filter tabs. Mirrors the single-collection route (./[id]/route.ts).
export async function GET() {
  const rows = (await getAllCollections())
    .filter((c) => c.isPublished)
    .sort(
      (a, b) => a.homeSortOrder - b.homeSortOrder || a.number.localeCompare(b.number)
    );

  const collections = await Promise.all(
    rows.map(async (c) => ({
      id: c.id,
      name: c.name,
      tag: c.tag,
      number: c.number,
      productIds: await getCollectionProductIds(c.id),
    }))
  );

  return Response.json(collections);
}
