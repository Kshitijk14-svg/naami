import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getAllCoupons, createCoupon, getCouponByCode } from "@/db/queries/coupons";
import { validateCouponInput } from "@/lib/coupons";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;
  return Response.json(await getAllCoupons());
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const validationError = validateCouponInput(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  if (await getCouponByCode(body.code)) {
    return Response.json({ error: "Coupon code already exists" }, { status: 409 });
  }

  const coupon = await createCoupon({
    code: body.code,
    discountType: body.discountType,
    discountValue: body.discountValue,
    minOrderValue: body.minOrderValue ?? null,
    maxDiscountInr: body.maxDiscountInr ?? null,
    usageLimit: body.usageLimit ?? null,
    perUserLimit: body.perUserLimit ?? null,
    perIpLimit: body.perIpLimit ?? null,
    startsAt: body.startsAt ?? null,
    expiresAt: body.expiresAt ?? null,
    isActive: body.isActive ?? true,
  });
  return Response.json(coupon, { status: 201 });
}
