import { NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { getAllCoupons, createCoupon } from '@/models/couponStore';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;
  return Response.json(getAllCoupons());
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  if (!body.code || !body.discountType || typeof body.discountValue !== 'number') {
    return Response.json({ error: 'code, discountType, and discountValue are required' }, { status: 400 });
  }

  try {
    const coupon = createCoupon({
      code: body.code,
      discountType: body.discountType,
      discountValue: body.discountValue,
      minOrderValue: body.minOrderValue,
      usageLimit: body.usageLimit,
      expiresAt: body.expiresAt,
      isActive: body.isActive ?? true,
    });
    return Response.json(coupon, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 409 });
  }
}
