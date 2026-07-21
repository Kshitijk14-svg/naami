import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { resolveInstagramOembed } from "@/lib/instagramOembed";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const url = request.nextUrl.searchParams.get("url");
  if (!url?.trim()) {
    return Response.json({ error: "Missing url parameter." }, { status: 400 });
  }

  const reel = await resolveInstagramOembed(url);
  if (!reel) {
    return Response.json({ error: "Could not resolve this URL." }, { status: 422 });
  }

  return Response.json(reel);
}
