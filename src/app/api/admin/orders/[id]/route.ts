import { NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { updateOrderStatus, OrderStatus } from '@/models/orderStore';

const VALID_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request, ['staff', 'admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updated = updateOrderStatus(id, body.status);
  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(updated);
}
