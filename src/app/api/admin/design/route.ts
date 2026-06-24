import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getAllDesignSettings, bulkSetSettings } from "@/db/queries/designSettings";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  return Response.json(await getAllDesignSettings());
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  if (typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Body must be a key-value object." }, { status: 400 });
  }

  // Sanitize: only allow string values, skip empty
  const updates: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === "string" && k.trim()) {
      updates[k.trim()] = v;
    }
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No valid settings provided." }, { status: 400 });
  }

  await bulkSetSettings(updates);
  return Response.json({ success: true });
}
