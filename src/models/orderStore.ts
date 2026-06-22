export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: number;
  name: string;
  priceINR: number;
  quantity: number;
  size?: string;
}

export interface Order {
  id: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  totalINR: number;
  couponCode?: string;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
}

const orderMap = new Map<string, Order>();
let orderCounter = 1;

function makeId() {
  return `ORD-${String(orderCounter++).padStart(4, '0')}`;
}

function seed(data: Omit<Order, 'id' | 'updatedAt'>) {
  const id = makeId();
  orderMap.set(id, { ...data, id, updatedAt: data.createdAt });
}

const now = Date.now();

seed({
  customerEmail: 'arjun.mehta@example.com',
  customerName: 'Arjun Mehta',
  items: [{ productId: 1, name: 'OXFORD STRIPE SHIRT', priceINR: 29900, quantity: 1, size: 'M' }],
  totalINR: 29900,
  status: 'delivered',
  createdAt: now - 7 * 24 * 60 * 60 * 1000,
});

seed({
  customerEmail: 'priya.sen@example.com',
  customerName: 'Priya Sen',
  items: [
    { productId: 6, name: 'NAAMI DRESS SHIRT', priceINR: 34900, quantity: 1, size: 'S' },
    { productId: 3, name: 'MOTHER-OF-PEARL BUTTON SET', priceINR: 9900, quantity: 2 },
  ],
  totalINR: 54700,
  couponCode: 'WELCOME10',
  status: 'shipped',
  createdAt: now - 2 * 24 * 60 * 60 * 1000,
});

seed({
  customerEmail: 'rohan.kapoor@example.com',
  customerName: 'Rohan Kapoor',
  items: [{ productId: 12, name: 'NAAMI KURTA SHIRT', priceINR: 43000, quantity: 1, size: 'L' }],
  totalINR: 43000,
  status: 'pending',
  createdAt: now - 3 * 60 * 60 * 1000,
});

export function getAllOrders(): Order[] {
  return Array.from(orderMap.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function getOrder(id: string): Order | undefined {
  return orderMap.get(id);
}

export function getOrdersByStatus(status: OrderStatus): Order[] {
  return getAllOrders().filter((o) => o.status === status);
}

export function updateOrderStatus(id: string, status: OrderStatus): Order | undefined {
  const existing = orderMap.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, status, updatedAt: Date.now() };
  orderMap.set(id, updated);
  return updated;
}

export interface Analytics {
  totalRevenue: number;
  orderCounts: Record<OrderStatus, number>;
  topProducts: { productId: number; name: string; count: number; revenue: number }[];
  recentOrders: Order[];
}

export function getAnalytics(): Analytics {
  const orders = getAllOrders();
  const statuses: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

  const orderCounts = statuses.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<OrderStatus, number>);
  const productTally = new Map<number, { name: string; count: number; revenue: number }>();
  let totalRevenue = 0;

  for (const order of orders) {
    orderCounts[order.status]++;
    if (order.status === 'delivered' || order.status === 'shipped') {
      totalRevenue += order.totalINR;
    }
    for (const item of order.items) {
      const prev = productTally.get(item.productId) ?? { name: item.name, count: 0, revenue: 0 };
      productTally.set(item.productId, {
        name: item.name,
        count: prev.count + item.quantity,
        revenue: prev.revenue + item.priceINR * item.quantity,
      });
    }
  }

  const topProducts = Array.from(productTally.entries())
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { totalRevenue, orderCounts, topProducts, recentOrders: orders.slice(0, 5) };
}
