import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getOrderById } from "@/db/queries/orders";
import { getUserByEmail } from "@/db/queries/users";

// Customer-facing order read. Any authenticated user may call it, but a customer
// may only read their OWN order — ownership is checked against the session user's
// id. Staff and above can read any order. Prevents the IDOR where changing the
// order id in the URL exposed another customer's PII.
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
  // Use 404 (not 403) so we never confirm the existence of someone else's order.
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });

  if (auth.role === "customer") {
    const user = await getUserByEmail(auth.email);
    if (!user || order.userId !== user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  return Response.json(order);
}
