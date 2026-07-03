import { NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { getAllCategories, createCategory } from '@/db/queries/categories';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;
  return Response.json(await getAllCategories());
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  if (!body.name || !body.slug) {
    return Response.json({ error: 'name and slug are required' }, { status: 400 });
  }

  try {
    const category = await createCategory({ name: body.name, slug: body.slug, description: body.description });
    return Response.json(category, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return Response.json({ error: 'Slug already exists' }, { status: 409 });
    }
    throw err;
  }
}
