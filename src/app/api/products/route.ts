import { getAllProducts } from '@/models/productStore';

export async function GET() {
  const products = getAllProducts().filter((p) => p.isPublished);
  return Response.json(products);
}
