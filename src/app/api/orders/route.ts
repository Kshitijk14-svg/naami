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

  const orders = await getOrdersByUserId(user.id);
  return Response.json(orders);
}
