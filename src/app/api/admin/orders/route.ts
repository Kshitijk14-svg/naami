import { NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { getAllOrders, getOrdersByStatus, OrderStatus } from '@/models/orderStore';

const VALID_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ['staff', 'admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const status = request.nextUrl.searchParams.get('status') as OrderStatus | null;
  if (status && VALID_STATUSES.includes(status)) {
    return Response.json(getOrdersByStatus(status));
  }

  return Response.json(getAllOrders());
}
