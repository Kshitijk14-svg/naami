import { NextRequest } from "next/server";
import { getCouponByCode } from "@/db/queries/coupons";
import { createLogger } from "@/lib/logger";

const log = createLogger("apply-coupon");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code: string = (body.code ?? "").toUpperCase().trim();
    const subtotal: number = Number(body.subtotal) || 0;

    if (!code) {
      return Response.json({ error: "Coupon code is required." }, { status: 400 });
    }

    const coupon = await getCouponByCode(code);

    if (!coupon || !coupon.isActive) {
      return Response.json({ error: "Invalid or inactive coupon." }, { status: 400 });
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return Response.json({ error: "This coupon has expired." }, { status: 400 });
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return Response.json({ error: "This coupon has reached its usage limit." }, { status: 400 });
    }

    if (coupon.minOrderValue !== null && subtotal < coupon.minOrderValue) {
      return Response.json(
        { error: `Minimum order value of ₹${coupon.minOrderValue.toLocaleString("en-IN")} required.` },
        { status: 400 }
      );
    }

    return Response.json({
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    });
  } catch (err) {
    log.error("unexpected failure", { err });
    return Response.json({ error: "Failed to apply coupon." }, { status: 500 });
  }
}
