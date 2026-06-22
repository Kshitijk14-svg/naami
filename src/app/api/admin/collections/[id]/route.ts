import { NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { getCollection, updateCollection, deleteCollection } from '@/models/collectionStore';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const collection = getCollection(Number(id));
  if (!collection) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(collection);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();
  const updated = updateCollection(Number(id), body);
  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const deleted = deleteCollection(Number(id));
  if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 });
  return new Response(null, { status: 204 });
}
