import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getOrderById, getOrderItems } from "@/db/queries/orders";
import { getUserByEmail } from "@/db/queries/users";
import { ensureInvoiceNumber, generateInvoicePdf } from "@/lib/invoice";
import { checkRateLimit } from "@/lib/redis";

// Roles allowed to read an order they do not own. The ownership check below
// is written against this list rather than against the literal "customer",
// so it fails safe: any role not named here is treated as a customer and
// scoped to its own orders. The previous shape — `if (auth.role === "customer")`
// — protected by naming the one role that must be restricted, which would have
// silently granted every order to any new role added to the allow-list.
const CROSS_ORDER_ROLES = new Set(["staff", "admin", "super_admin"]);

// Customer invoice download. Same ownership rule as GET /api/orders/[id]:
// customers may only fetch their own order's invoice; staff+ can fetch any.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Generating a PDF on every request is the cheapest CPU lever in the app,
  // and any signed-in customer could loop it against their own order.
  const auth = await verifyAdminRequest(request, [
    "customer",
    "staff",
    "admin",
    "super_admin",
  ]);
  if (auth instanceof Response) return auth;

  const rate = await checkRateLimit(`invoice:${auth.email}`, {
    requests: 20,
    window: "5 m",
  });
  if (rate?.limited) {
    return Response.json(
      { error: "Too many invoice downloads. Please wait a moment." },
      { status: 429 }
    );
  }

  const { id } = await params;
  const order = await getOrderById(id);
  // Use 404 (not 403) so we never confirm the existence of someone else's order.
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });

  if (!CROSS_ORDER_ROLES.has(auth.role)) {
    const user = await getUserByEmail(auth.email);
    if (!user || order.userId !== user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  const invoiceNumber = await ensureInvoiceNumber(id);
  const items = await getOrderItems(id);
  const pdf = await generateInvoicePdf({ ...order, invoiceNumber }, items);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoiceNumber}.pdf"`,
    },
  });
}
