export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

/**
 * Allowed forward transitions for each status. Terminal states (delivered,
 * cancelled) allow none. No refund/cancellation workflow beyond the existing
 * cancelled status (explicit product decision).
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}
