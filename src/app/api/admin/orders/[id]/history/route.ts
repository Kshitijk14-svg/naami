import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getOrderStatusHistory } from "@/db/queries/orders";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["staff", "admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  return Response.json(await getOrderStatusHistory(id));
}
