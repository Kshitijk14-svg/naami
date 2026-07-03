import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { dbRead } from "@/lib/db";
import { couponRedemptions, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const couponId = Number(id);
  if (!Number.isInteger(couponId)) {
    return Response.json({ error: "Invalid coupon id" }, { status: 400 });
  }

  const rows = await dbRead
    .select({
      id: couponRedemptions.id,
      orderId: couponRedemptions.orderId,
      userEmail: users.email,
      ip: couponRedemptions.ip,
      discountInr: couponRedemptions.discountInr,
      createdAt: couponRedemptions.createdAt,
    })
    .from(couponRedemptions)
    .leftJoin(users, eq(couponRedemptions.userId, users.id))
    .where(eq(couponRedemptions.couponId, couponId))
    .orderBy(desc(couponRedemptions.createdAt));

  return Response.json(rows);
}
