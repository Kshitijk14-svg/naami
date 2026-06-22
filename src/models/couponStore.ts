export interface Coupon {
  id: number;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderValue?: number;
  usageLimit?: number;
  usedCount: number;
  expiresAt?: number;
  isActive: boolean;
  createdAt: number;
}

const couponMap = new Map<number, Coupon>();
let nextId = 1;

export function getAllCoupons(): Coupon[] {
  return Array.from(couponMap.values());
}

export function getCoupon(id: number): Coupon | undefined {
  return couponMap.get(id);
}

export function getCouponByCode(code: string): Coupon | undefined {
  const upper = code.trim().toUpperCase();
  return Array.from(couponMap.values()).find((c) => c.code === upper);
}

export function createCoupon(data: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>): Coupon {
  const code = data.code.trim().toUpperCase();
  if (getCouponByCode(code)) throw new Error('Coupon code already exists');
  const coupon: Coupon = { ...data, code, id: nextId++, usedCount: 0, createdAt: Date.now() };
  couponMap.set(coupon.id, coupon);
  return coupon;
}

export function updateCoupon(id: number, data: Partial<Omit<Coupon, 'id' | 'createdAt'>>): Coupon | undefined {
  const existing = couponMap.get(id);
  if (!existing) return undefined;
  if (data.code) data.code = data.code.trim().toUpperCase();
  const updated = { ...existing, ...data };
  couponMap.set(id, updated);
  return updated;
}

export function deleteCoupon(id: number): boolean {
  return couponMap.delete(id);
}
