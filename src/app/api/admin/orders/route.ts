import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getAllOrders, getOrdersByStatus } from "@/db/queries/orders";

const VALID_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["staff", "admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const status = request.nextUrl.searchParams.get("status");
  if (status && VALID_STATUSES.includes(status)) {
    return Response.json(await getOrdersByStatus(status));
  }

  return Response.json(await getAllOrders());
}
