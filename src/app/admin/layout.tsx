import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { verifyAdminSession } from "@/lib/adminAuth";

// Server-side gate for every /admin page.
//
// The proxy already redirects unauthenticated visitors, and AdminShell repeats
// the check in the browser, but neither is a place to *rely* on: a matcher edit
// silently removes proxy coverage, and a client check is advisory by nature.
// Re-checking here means admin chrome never renders without a verified session,
// and the role is read from the database rather than a week-old token claim.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get("naami_session")?.value;
  const session = await verifyAdminSession(token, ["staff", "admin", "super_admin"]);

  if (!session) redirect("/auth?from=/admin");

  return <AdminShell>{children}</AdminShell>;
}
