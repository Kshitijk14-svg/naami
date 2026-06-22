import { NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { getAllCategories, createCategory } from '@/models/categoryStore';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;
  return Response.json(getAllCategories());
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  if (!body.name || !body.slug) {
    return Response.json({ error: 'name and slug are required' }, { status: 400 });
  }

  const category = createCategory({ name: body.name, slug: body.slug, description: body.description });
  return Response.json(category, { status: 201 });
}
