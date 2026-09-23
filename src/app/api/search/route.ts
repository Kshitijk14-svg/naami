import { NextRequest } from "next/server";
import { searchProducts } from "@/db/queries/products";
import { formatINR } from "@/lib/format";
import { checkRateLimit } from "@/lib/redis";
import { rateLimitKey } from "@/lib/requestIp";

// Longer terms cannot match a product name and only cost a scan, so cap the
// length rather than letting an arbitrary string through. searchProducts()
// also caches per term in Redis, so unbounded input meant unbounded cache keys.
const MAX_QUERY_LENGTH = 64;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2 || q.length > MAX_QUERY_LENGTH) return Response.json([]);

  // Unauthenticated and backed by a per-term DB scan — throttle it.
  const rate = await checkRateLimit(`search:${rateLimitKey(request)}`, {
    requests: 40,
    window: "1 m",
  });
  if (rate?.limited) {
    return Response.json({ error: "Too many searches. Please slow down." }, { status: 429 });
  }

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
