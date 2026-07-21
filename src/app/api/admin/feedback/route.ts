import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getAllFeedback } from "@/db/queries/brandFeedback";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const feedback = await getAllFeedback();
  return Response.json(feedback);
}
