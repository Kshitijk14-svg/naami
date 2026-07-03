import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getOrderById } from "@/db/queries/orders";
import { ensureInvoiceNumber } from "@/lib/invoice";
import { enqueueJob } from "@/lib/jobs";

/**
 * Queue an invoice email to the customer. The jobs worker regenerates the PDF
 * at send time (payload carries only the order id) and retries with backoff.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["staff", "admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });
  if (!order.shippingEmail) {
    return Response.json({ error: "Order has no customer email." }, { status: 400 });
  }

  const invoiceNumber = await ensureInvoiceNumber(id);
  await enqueueJob("email:invoice", { orderId: id });

  return Response.json({ queued: true, invoiceNumber }, { status: 202 });
}
