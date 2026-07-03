import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { db } from "@/lib/db";
import { abandonedCarts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserByEmail } from "@/db/queries/users";
import {
  priceCart,
  resolveCoupon,
  CheckoutPricingError,
  type CartItemInput,
} from "@/lib/checkoutPricing";
import { clientIp } from "@/lib/requestIp";
import { createLogger } from "@/lib/logger";

const log = createLogger("create-order");
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export async function POST(request: NextRequest) {
  // Any authenticated user can checkout
  const auth = await verifyAdminRequest(request, ["customer", "staff", "admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return Response.json({ error: "Payment gateway not configured." }, { status: 503 });
    }

    const body = await request.json();
    const items: CartItemInput[] = Array.isArray(body.items) ? body.items : [];
    const shippingEmail: string = (body.shippingEmail ?? "").trim();
    const couponCode: string = (body.couponCode ?? "").toUpperCase().trim();

    // Price the cart from DB rows — client-sent prices are never trusted.
    let subtotalInr: number;
    let pricedItems;
    try {
      ({ subtotalInr, pricedItems } = await priceCart(items));
    } catch (err) {
      if (err instanceof CheckoutPricingError) {
        return Response.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    // Apply the coupon server-side so the Razorpay charge reflects the discount.
    let discountInr = 0;
    if (couponCode) {
      const user = await getUserByEmail(auth.email);
      if (!user) {
        return Response.json({ error: "User not found." }, { status: 401 });
      }
      const result = await resolveCoupon(couponCode, subtotalInr, user.id, clientIp(request));
      if ("error" in result) {
        return Response.json({ error: result.error }, { status: 400 });
      }
      discountInr = result.discountInr;
    }

    const payableInr = Math.max(0, subtotalInr - discountInr);

    // Save/update abandoned cart snapshot — deleted after successful payment
    if (shippingEmail) {
      const snapshot = JSON.stringify(
        pricedItems.map((i) => ({
          productName: i.name,
          unitPriceInr: i.unitPriceInr,
          quantity: i.quantity,
          size: i.size,
        }))
      );
      const existing = await db
        .select({ id: abandonedCarts.id })
        .from(abandonedCarts)
        .where(eq(abandonedCarts.email, shippingEmail.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(abandonedCarts)
          .set({ items: snapshot, updatedAt: new Date() })
          .where(eq(abandonedCarts.id, existing[0].id));
      } else {
        await db.insert(abandonedCarts).values({
          email: shippingEmail.toLowerCase(),
          items: snapshot,
        });
      }
    }

    // Create Razorpay order
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: payableInr * 100, // paise
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
      }),
    });

    if (!rzpRes.ok) {
      const rzpErr = await rzpRes.text();
      log.error("Razorpay order creation failed", { status: rzpRes.status, rzpErr });
      return Response.json({ error: "Failed to create payment order." }, { status: 502 });
    }

    const rzpOrder = await rzpRes.json();
    return Response.json({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      subtotalInr,
      discountInr,
      payableInr,
    });
  } catch (err) {
    log.error("unexpected failure", { err });
    return Response.json({ error: "An error occurred. Please try again." }, { status: 500 });
  }
}
