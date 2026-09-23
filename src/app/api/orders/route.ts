import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getOrdersByUserId } from "@/db/queries/orders";
import { getUserByEmail } from "@/db/queries/users";

// Customer-facing: returns the authenticated user's own orders.
export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, [
    "customer",
    "staff",
    "admin",
    "super_admin",
  ]);
  if (auth instanceof Response) return auth;

  const user = await getUserByEmail(auth.email);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  // getOrdersByUserId() returns whole rows. Strip adminNotes for the same
  // reason /api/orders/[id] does: it is internal staff commentary — fraud
  // flags, refund reasoning, notes about the customer — and must not reach the
  // customer it was written about. The single-order route filtered it; this one
  // was missed.
  const rows = await getOrdersByUserId(user.id);
  const orders = rows.map(
    ({ adminNotes: _adminNotes, ...customerVisible }) => customerVisible
  );
  return Response.json(orders);
}
