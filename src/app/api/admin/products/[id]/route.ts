import { NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { getProduct, updateProduct, deleteProduct } from '@/models/productStore';

function formatPrice(priceINR: number): string {
  return `₹${priceINR.toLocaleString('en-IN')}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const product = getProduct(Number(id));
  if (!product) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(product);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();

  if (typeof body.priceINR === 'number') {
    body.price = formatPrice(body.priceINR);
  }

  const updated = updateProduct(Number(id), body);
  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const deleted = deleteProduct(Number(id));
  if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 });
  return new Response(null, { status: 204 });
}
