import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getOrderById, getOrderItems } from "@/db/queries/orders";
import { getUserByEmail } from "@/db/queries/users";
import { ensureInvoiceNumber, generateInvoicePdf } from "@/lib/invoice";

// Customer invoice download. Same ownership rule as GET /api/orders/[id]:
// customers may only fetch their own order's invoice; staff+ can fetch any.
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
