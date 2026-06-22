import { NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { getAllCollections, createCollection } from '@/models/collectionStore';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;
  return Response.json(getAllCollections());
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  if (!body.name || !body.number) {
    return Response.json({ error: 'name and number are required' }, { status: 400 });
  }

  const collection = createCollection({
    number: body.number,
    name: body.name,
    tag: body.tag ?? '',
    description: body.description ?? '',
    image: body.image ?? '/images/product-jacket.png',
    productIds: Array.isArray(body.productIds) ? body.productIds : [],
    isPublished: body.isPublished ?? true,
  });

  return Response.json(collection, { status: 201 });
}
