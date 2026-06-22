import { NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { getAnalytics } from '@/models/orderStore';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ['admin', 'super_admin']);
  if (auth instanceof Response) return auth;

  return Response.json(getAnalytics());
}
