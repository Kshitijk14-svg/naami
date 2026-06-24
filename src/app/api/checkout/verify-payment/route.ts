import { NextRequest } from "next/server";
import { createHmac } from "node:crypto";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getUserByEmail } from "@/db/queries/users";
import { createOrder } from "@/db/queries/orders";
import { db } from "@/lib/db";
import { abandonedCarts, products } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { sendOrderConfirmation, sendLowStockAlert } from "@/lib/email";
import { getOrderItems } from "@/db/queries/orders";
import type { CartItem } from "@/models/cartStore";

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["customer", "staff", "admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  try {
    if (!RAZORPAY_KEY_SECRET) {
      return Response.json({ error: "Payment gateway not configured." }, { status: 503 });
    }

    const body = await request.json();
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      items,
      shippingName,
      shippingEmail,
      shippingPhone,
      shippingAddress,
      couponCode,
    }: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      items: CartItem[];
      shippingName?: string;
      shippingEmail?: string;
      shippingPhone?: string;
      shippingAddress?: { line1: string; line2?: string; city: string; state: string; pincode: string };
      couponCode?: string;
    } = body;

    // 1. Verify HMAC-SHA256 signature
    const expectedSig = createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSig !== razorpaySignature) {
      return Response.json({ error: "Payment signature verification failed." }, { status: 400 });
    }

    // 2. Look up user
    const user = await getUserByEmail(auth.email);
    if (!user) {
      return Response.json({ error: "User not found." }, { status: 401 });
    }

    // 3. Build order items from cart (server uses client prices for MVP;
    //    for production, look up DB prices here)
    const orderItemsInput = items.map((i) => ({
      productId: i.productId,
      name: i.name,
      unitPriceInr: i.priceInr,
      quantity: i.quantity,
      size: i.size,
    }));

    const totalInr = items.reduce((sum, i) => sum + i.priceInr * i.quantity, 0);

    // 4. Create DB order atomically (includes coupon deduction + stock lock)
    const order = await createOrder({
      userId: user.id,
      items: orderItemsInput,
      totalInr,
      couponCode: couponCode || undefined,
      shippingName: shippingName || undefined,
      shippingEmail: shippingEmail || undefined,
      shippingPhone: shippingPhone || undefined,
      shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : undefined,
      razorpayOrderId,
      razorpayPaymentId,
    });

    // 5. Delete abandoned cart record (payment succeeded)
    if (shippingEmail) {
      await db
        .delete(abandonedCarts)
        .where(eq(abandonedCarts.email, shippingEmail.toLowerCase()));
    }

    // 6. Check for low-stock products (fire-and-forget)
    checkLowStock(items).catch((err) => console.error("[verify-payment] low-stock check:", err));

    // 7. Send order confirmation email (fire-and-forget)
    if (shippingEmail) {
      const orderItemRows = await getOrderItems(order.id);
      sendOrderConfirmation(shippingEmail, {
        id: order.id,
        totalInr: order.totalInr,
        shippingName: order.shippingName,
        shippingAddress: order.shippingAddress,
      }, orderItemRows).catch((err) => console.error("[verify-payment] email:", err));
    }

    return Response.json({ orderId: order.id });
  } catch (err) {
    console.error("[verify-payment]", err);
    return Response.json({ error: "Order creation failed. Please contact support." }, { status: 500 });
  }
}

async function checkLowStock(cartItems: CartItem[]): Promise<void> {
  const productIds = [...new Set(cartItems.map((i) => i.productId))];
  const lowStockItems = [];
  for (const id of productIds) {
    const rows = await db
      .select({
        name: products.name,
        number: products.number,
        stock: products.stock,
        lowStockThreshold: products.lowStockThreshold,
      })
      .from(products)
      .where(and(eq(products.id, id), lt(products.stock, products.lowStockThreshold)))
      .limit(1);
    if (rows.length > 0) lowStockItems.push(rows[0]);
  }
  if (lowStockItems.length > 0) {
    await sendLowStockAlert(lowStockItems);
  }
}
