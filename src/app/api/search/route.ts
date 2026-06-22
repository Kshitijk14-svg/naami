import { NextRequest } from 'next/server';
import { getAllProducts } from '@/models/productStore';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  if (q.trim().length < 2) return Response.json([]);

  const lower = q.toLowerCase();
  const results = getAllProducts()
    .filter(
      (p) =>
        p.isPublished &&
        (p.name.toLowerCase().includes(lower) ||
          p.subtitle.toLowerCase().includes(lower) ||
          p.material.toLowerCase().includes(lower))
    )
    .slice(0, 6)
    .map(({ id, name, subtitle, price, image }) => ({ id, name, subtitle, price, image }));

  return Response.json(results);
}
