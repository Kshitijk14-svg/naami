import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getOrderById, getOrderItems } from "@/db/queries/orders";
import { getUserByEmail } from "@/db/queries/users";

// Roles allowed to read an order they do not own. The ownership check below
// is written against this list rather than against the literal "customer",
// so it fails safe: any role not named here is treated as a customer and
// scoped to its own orders. The previous shape — `if (auth.role === "customer")`
// — protected by naming the one role that must be restricted, which would have
// silently granted every order to any new role added to the allow-list.
const CROSS_ORDER_ROLES = new Set(["staff", "admin", "super_admin"]);

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

  if (!CROSS_ORDER_ROLES.has(auth.role)) {
    const user = await getUserByEmail(auth.email);
    if (!user || order.userId !== user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  const items = await getOrderItems(id);
  return Response.json(items);
}
