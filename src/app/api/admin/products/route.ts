import { NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { getAllProducts, createProduct } from '@/models/productStore';

function formatPrice(priceINR: number): string {
  return `₹${priceINR.toLocaleString('en-IN')}`;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  return Response.json(getAllProducts());
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { name, priceINR, stock, ...rest } = body;

  if (!name || typeof priceINR !== 'number' || typeof stock !== 'number') {
    return Response.json({ error: 'name, priceINR, and stock are required' }, { status: 400 });
  }

  const product = createProduct({
    name,
    priceINR,
    stock,
    price: formatPrice(priceINR),
    isPublished: body.isPublished ?? true,
    number: rest.number ?? '',
    subtitle: rest.subtitle ?? '',
    material: rest.material ?? '',
    fit: rest.fit ?? '',
    origin: rest.origin ?? '',
    image: rest.image ?? '/images/product-jacket.png',
    category: rest.category,
    sizes: rest.sizes,
  });

  return Response.json(product, { status: 201 });
}
