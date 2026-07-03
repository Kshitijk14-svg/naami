import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getOrderById,
  updateOrderStatus,
  updateOrderAdminFields,
  InvalidTransitionError,
} from "@/db/queries/orders";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Staff+ only. Customers read their own orders via GET /api/orders/[id]
  // (ownership-checked); this admin route must not expose arbitrary orders.
  const auth = await verifyAdminRequest(request, ["staff", "admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(order);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["staff", "admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();

  // Notes/tracking-only edit — no status change, no history entry, no email.
  if (!body.status) {
    const updated = await updateOrderAdminFields(id, {
      adminNotes: body.adminNotes,
      trackingNumber: body.trackingNumber,
      trackingCarrier: body.trackingCarrier,
      trackingUrl: body.trackingUrl,
    });
    if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(updated);
  }

  try {
    const updated = await updateOrderStatus(id, body.status, auth.email, {
      note: body.note,
      trackingNumber: body.trackingNumber,
      trackingCarrier: body.trackingCarrier,
      trackingUrl: body.trackingUrl,
    });
    if (!updated) return Response.json({ error: "Not found or invalid status" }, { status: 404 });

    // adminNotes may ride along with a status change.
    if (body.adminNotes !== undefined) {
      await updateOrderAdminFields(id, { adminNotes: body.adminNotes });
    }

    return Response.json(updated);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return Response.json({ error: err.message, allowed: err.allowed }, { status: 409 });
    }
    throw err;
  }
}
