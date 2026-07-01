import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getOrderById, getOrderItems } from "@/db/queries/orders";
import { getUserByEmail } from "@/db/queries/users";

// Items for a customer's own order. Same ownership rule as GET /api/orders/[id]:
// a customer may only read items belonging to their own order.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, [
    "customer",
    "staff",
    "admin",
    "super_admin",
  ]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });

  if (auth.role === "customer") {
    const user = await getUserByEmail(auth.email);
    if (!user || order.userId !== user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  const items = await getOrderItems(id);
  return Response.json(items);
}
