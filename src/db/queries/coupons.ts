import { db } from "@/lib/db";
import { coupons } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export type CouponRow = typeof coupons.$inferSelect;

// Coupons are not Redis-cached and read from the PRIMARY, not the replica —
// usedCount / validity must always be fresh (no replication lag) since these
// reads gate money mutations.

export async function getAllCoupons() {
  return db.select().from(coupons).where(isNull(coupons.deletedAt));
}

export async function getCouponById(id: number) {
  const rows = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.id, id), isNull(coupons.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCouponByCode(code: string) {
  const upper = code.trim().toUpperCase();
  const rows = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.code, upper), isNull(coupons.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export interface CouponInput {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscountInr?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  perIpLimit?: number | null;
  /** ISO datetime strings (UTC). */
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
}

function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export async function createCoupon(data: CouponInput) {
  const code = data.code.trim().toUpperCase();
  const [coupon] = await db
    .insert(coupons)
    .values({
      code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderValue: data.minOrderValue ?? null,
      maxDiscountInr: data.maxDiscountInr ?? null,
      usageLimit: data.usageLimit ?? null,
      perUserLimit: data.perUserLimit ?? null,
      perIpLimit: data.perIpLimit ?? null,
      startsAt: toDate(data.startsAt),
      expiresAt: toDate(data.expiresAt),
      isActive: data.isActive ?? true,
    })
    .returning();
  return coupon;
}

export async function updateCoupon(id: number, data: Partial<CouponInput>) {
  const update: Record<string, unknown> = {};
  if (data.code !== undefined) update.code = data.code.trim().toUpperCase();
  if (data.discountType !== undefined) update.discountType = data.discountType;
  if (data.discountValue !== undefined) update.discountValue = data.discountValue;
  if (data.minOrderValue !== undefined) update.minOrderValue = data.minOrderValue;
  if (data.maxDiscountInr !== undefined) update.maxDiscountInr = data.maxDiscountInr;
  if (data.usageLimit !== undefined) update.usageLimit = data.usageLimit;
  if (data.perUserLimit !== undefined) update.perUserLimit = data.perUserLimit;
  if (data.perIpLimit !== undefined) update.perIpLimit = data.perIpLimit;
  if (data.startsAt !== undefined) update.startsAt = toDate(data.startsAt);
  if (data.expiresAt !== undefined) update.expiresAt = toDate(data.expiresAt);
  if (data.isActive !== undefined) update.isActive = data.isActive;

  const [updated] = await db
    .update(coupons)
    .set(update)
    .where(and(eq(coupons.id, id), isNull(coupons.deletedAt)))
    .returning();
  return updated ?? null;
}

export async function deleteCoupon(id: number) {
  const [deleted] = await db
    .update(coupons)
    .set({ deletedAt: new Date() })
    .where(and(eq(coupons.id, id), isNull(coupons.deletedAt)))
    .returning();
  return !!deleted;
}
