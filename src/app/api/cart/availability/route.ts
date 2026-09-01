import { NextRequest } from "next/server";
import { dbRead } from "@/lib/db";
import { products, productSizes } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { checkRateLimit } from "@/lib/redis";
import { rateLimitKey } from "@/lib/requestIp";

interface CartLineInput {
  productId: number;
  size: string;
}

interface AvailabilityResult {
  productId: number;
  size: string;
  /** null = infinite stock (trackStock off); otherwise units currently available. */
  stock: number | null;
  available: boolean;
}

/** Nobody's cart is larger than this; the cap keeps the IN (...) list bounded. */
const MAX_LINES = 100;

function isValidLine(l: unknown): l is CartLineInput {
  return (
    !!l &&
    typeof (l as CartLineInput).productId === "number" &&
    typeof (l as CartLineInput).size === "string"
  );
}

// Public, unauthenticated — same trust level as the product detail endpoint,
// which is exactly why the isPublished filter below is not optional: without it
// this route leaked stock levels for unreleased products to anyone willing to
// enumerate ids, while /api/products/[id] 404s them.
//
// Used by the cart page to grey out lines that went out of stock after being
// added; createOrder()'s server-side guard is the real backstop regardless.
export async function POST(request: NextRequest) {
  // Unauthenticated and it hits the DB, so it is throttled per client IP.
  // rateLimitKey() never returns null — an absent IP must not disable the limit.
  const rate = await checkRateLimit(`cart-availability:${rateLimitKey(request)}`, {
    requests: 60,
    window: "1 m",
  });
  if (rate?.limited) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed: CartLineInput[] = Array.isArray(body?.lines) ? body.lines.filter(isValidLine) : [];
  if (parsed.length === 0) {
    return Response.json({ results: [] });
  }
  const lines = parsed.slice(0, MAX_LINES);

  const productIds = [...new Set(lines.map((l) => l.productId))];

  const [productRows, sizeRows] = await Promise.all([
    dbRead
      .select({ id: products.id, stock: products.stock, trackStock: products.trackStock })
      .from(products)
      .where(and(inArray(products.id, productIds), eq(products.isPublished, true))),
    dbRead
      .select({ productId: productSizes.productId, size: productSizes.size, stock: productSizes.stock })
      .from(productSizes)
      .where(inArray(productSizes.productId, productIds)),
  ]);

  const productMap = new Map(productRows.map((p) => [p.id, p]));
  const sizeStockMap = new Map(sizeRows.map((s) => [`${s.productId}::${s.size}`, s.stock]));
  const productsWithSizes = new Set(sizeRows.map((s) => s.productId));

  const results: AvailabilityResult[] = lines.map((line) => {
    const product = productMap.get(line.productId);
    // Unknown *or* unpublished: indistinguishable to the caller, by design.
    if (!product) {
      return { productId: line.productId, size: line.size, stock: 0, available: false };
    }
    if (!product.trackStock) {
      return { productId: line.productId, size: line.size, stock: null, available: true };
    }
    if (productsWithSizes.has(line.productId)) {
      const stock = sizeStockMap.get(`${line.productId}::${line.size}`) ?? 0;
      return { productId: line.productId, size: line.size, stock, available: stock > 0 };
    }
    return { productId: line.productId, size: line.size, stock: product.stock, available: product.stock > 0 };
  });

  return Response.json(
    { results },
    { headers: { "Cache-Control": "no-store" } }
  );
}
