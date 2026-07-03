import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getCouponById, updateCoupon, deleteCoupon } from "@/db/queries/coupons";
import { validateCouponInput } from "@/lib/coupons";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const coupon = await getCouponById(Number(id));
  if (!coupon) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(coupon);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();

  const validationError = validateCouponInput(body, true);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const updated = await updateCoupon(Number(id), body);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const deleted = await deleteCoupon(Number(id));
  if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
