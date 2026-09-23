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

/**
 * Validate the free-text tracking fields. These are written by staff and then
 * rendered on the customer's order page and interpolated into the shipment
 * email, so they are not "trusted input" just because an admin cookie was
 * required — a single compromised staff account otherwise gets to put an
 * arbitrary link, including a javascript: URL, in front of every customer.
 * Returns an error message, or null when the fields are acceptable.
 */
function trackingFieldsError(body: Record<string, unknown>): string | null {
  for (const field of ["adminNotes", "trackingNumber", "trackingCarrier", "note"]) {
    const v = body[field];
    if (v !== undefined && v !== null && typeof v !== "string") {
      return `${field} must be a string.`;
    }
  }

  const url = body.trackingUrl;
  if (url === undefined || url === null || url === "") return null;
  if (typeof url !== "string") return "trackingUrl must be a string.";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "trackingUrl must be a full URL, e.g. https://tracking.example.com/ABC123.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "trackingUrl must be an http or https link.";
  }
  return null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["staff", "admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();

  const fieldError = trackingFieldsError(body);
  if (fieldError) return Response.json({ error: fieldError }, { status: 400 });

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
