import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getUserByEmail } from "@/db/queries/users";
import { resolveCoupon, priceCart, CheckoutPricingError, type CartItemInput } from "@/lib/checkoutPricing";
import { clientIp } from "@/lib/requestIp";
import { checkRateLimit } from "@/lib/redis";
import { createLogger } from "@/lib/logger";

const log = createLogger("apply-coupon");

export async function POST(request: NextRequest) {
  // Auth required: per-user limits need an identity, and it blocks anonymous
  // coupon-code enumeration.
  const auth = await verifyAdminRequest(request, ["customer", "staff", "admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  try {
    const ip = clientIp(request);

    // Brute-force guard on coupon codes (fail open on Redis trouble).
    const rate = await checkRateLimit(`coupon:${ip ?? auth.email}`, {
      requests: 10,
      window: "1 m",
    });
    if (rate?.limited) {
      return Response.json(
        { error: "Too many attempts. Please try again in a minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const code: string = (body.code ?? "").toUpperCase().trim();
    if (!code) {
      return Response.json({ error: "Coupon code is required." }, { status: 400 });
    }

    // Price the cart server-side — the discount must be computed from DB
    // prices, never a client-sent subtotal.
    const items: CartItemInput[] = Array.isArray(body.items) ? body.items : [];
    let subtotalInr: number;
    try {
      ({ subtotalInr } = await priceCart(items));
    } catch (err) {
      if (err instanceof CheckoutPricingError) {
        return Response.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    const user = await getUserByEmail(auth.email);
    if (!user) {
      return Response.json({ error: "User not found." }, { status: 401 });
    }

    const result = await resolveCoupon(code, subtotalInr, user.id, ip);
    if ("error" in result) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({
      code: result.coupon.code,
      discountInr: result.discountInr,
      discountType: result.coupon.discountType,
      discountValue: result.coupon.discountValue,
    });
  } catch (err) {
    log.error("unexpected failure", { err });
    return Response.json({ error: "Failed to apply coupon." }, { status: 500 });
  }
}
