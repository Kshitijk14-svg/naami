import { db } from "@/lib/db";
import { coupons } from "@/db/schema";
import { eq } from "drizzle-orm";

export type CouponRow = typeof coupons.$inferSelect;

// Coupons are not Redis-cached — correctness of usedCount must always be fresh.

export async function getAllCoupons() {
  return db.select().from(coupons);
}

export async function getCouponById(id: number) {
  const rows = await db
    .select()
    .from(coupons)
    .where(eq(coupons.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCouponByCode(code: string) {
  const upper = code.trim().toUpperCase();
  const rows = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, upper))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCoupon(data: {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minOrderValue?: number;
  usageLimit?: number;
  expiresAt?: number;
  isActive?: boolean;
}) {
  const code = data.code.trim().toUpperCase();
  const [coupon] = await db
    .insert(coupons)
    .values({
      code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderValue: data.minOrderValue ?? null,
      usageLimit: data.usageLimit ?? null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isActive: data.isActive ?? true,
    })
    .returning();
  return coupon;
}

export async function updateCoupon(
  id: number,
  data: Partial<{
    code: string;
    discountType: "percent" | "fixed";
    discountValue: number;
    minOrderValue: number;
    usageLimit: number;
    expiresAt: number;
    isActive: boolean;
  }>
) {
  const update = { ...data } as Record<string, unknown>;
  if (data.code) update.code = data.code.trim().toUpperCase();
  if (data.expiresAt) update.expiresAt = new Date(data.expiresAt);

  const [updated] = await db
    .update(coupons)
    .set(update)
    .where(eq(coupons.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteCoupon(id: number) {
  const [deleted] = await db
    .delete(coupons)
    .where(eq(coupons.id, id))
    .returning();
  return !!deleted;
}
