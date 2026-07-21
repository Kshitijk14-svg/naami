import { NextRequest } from "next/server";
import { dbRead } from "@/lib/db";
import { products, productSizes } from "@/db/schema";
import { inArray } from "drizzle-orm";

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

function isValidLine(l: unknown): l is CartLineInput {
  return (
    !!l &&
    typeof (l as CartLineInput).productId === "number" &&
    typeof (l as CartLineInput).size === "string"
  );
}

// Public, unauthenticated — same trust level as the product detail endpoint.
// Used by the cart page to grey out lines that went out of stock after being
// added; createOrder()'s server-side guard is the real backstop regardless.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const lines: CartLineInput[] = Array.isArray(body?.lines) ? body.lines.filter(isValidLine) : [];
  if (lines.length === 0) {
    return Response.json({ results: [] });
  }

  const productIds = [...new Set(lines.map((l) => l.productId))];

  const [productRows, sizeRows] = await Promise.all([
    dbRead
      .select({ id: products.id, stock: products.stock, trackStock: products.trackStock })
      .from(products)
      .where(inArray(products.id, productIds)),
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
