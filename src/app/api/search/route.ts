import { NextRequest } from "next/server";
import { searchProducts } from "@/db/queries/products";
import { formatINR } from "@/lib/format";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return Response.json([]);

  const results = await searchProducts(q);
  return Response.json(
    results.map((p) => ({
      id: p.id,
      name: p.name,
      subtitle: p.subtitle,
      price: formatINR(p.priceInr),
      image: p.image,
      thumbnailImage: p.thumbnailImage ?? p.image,
    }))
  );
}
