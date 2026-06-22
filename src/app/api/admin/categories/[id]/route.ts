import { NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { getCategory, updateCategory, deleteCategory } from '@/models/categoryStore';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const category = getCategory(Number(id));
  if (!category) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(category);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();
  const updated = updateCategory(Number(id), body);
  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const deleted = deleteCategory(Number(id));
  if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 });
  return new Response(null, { status: 204 });
}
