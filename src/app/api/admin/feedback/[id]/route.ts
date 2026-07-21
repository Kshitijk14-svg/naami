import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { setFeedbackApproval } from "@/db/queries/brandFeedback";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.isApproved !== "boolean") {
    return Response.json({ error: "isApproved (boolean) is required." }, { status: 400 });
  }

  const updated = await setFeedbackApproval(Number(id), body.isApproved);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(updated);
}
