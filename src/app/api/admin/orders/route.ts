import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { searchOrders } from "@/db/queries/orders";

// IST calendar dates from the admin UI → UTC instants bounding that IST day.
function istDateToUtc(date: string | null, endOfDay: boolean): string | undefined {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const time = endOfDay ? "23:59:59" : "00:00:00";
  const d = new Date(`${date}T${time}+05:30`);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["staff", "admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const params = request.nextUrl.searchParams;
  return Response.json(
    await searchOrders({
      q: params.get("q") ?? undefined,
      status: params.get("status") ?? undefined,
      from: istDateToUtc(params.get("from"), false),
      to: istDateToUtc(params.get("to"), true),
    })
  );
}
