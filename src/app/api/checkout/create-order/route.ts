import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { db } from "@/lib/db";
import { abandonedCarts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
import type { CartItem } from "@/models/cartStore";

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
    const items: CartItem[] = body.items ?? [];
    const shippingEmail: string = (body.shippingEmail ?? "").trim();

    if (!items.length) {
      return Response.json({ error: "Cart is empty." }, { status: 400 });
    }

    // Validate items
    for (const item of items) {
      if (!item.productId || item.priceInr <= 0 || item.quantity < 1) {
        return Response.json({ error: "Invalid cart item." }, { status: 400 });
      }
    }

    const subtotal = items.reduce((sum, i) => sum + i.priceInr * i.quantity, 0);

    // Save/update abandoned cart snapshot — deleted after successful payment
    if (shippingEmail) {
      const snapshot = JSON.stringify(
        items.map((i) => ({
          productName: i.name,
          unitPriceInr: i.priceInr,
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
        amount: subtotal * 100, // paise
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
    });
  } catch (err) {
    log.error("unexpected failure", { err });
    return Response.json({ error: "An error occurred. Please try again." }, { status: 500 });
  }
}
