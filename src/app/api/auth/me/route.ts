import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role } from "@/models/roles";
import { getUserByEmail } from "@/db/queries/users";
import { getJwtSecret } from "@/lib/jwt";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("naami_session")?.value;

    if (!token) {
      return Response.json({ authenticated: false }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
    const email = payload.email as string;
    const user = await getUserByEmail(email);

    // Soft-deleted accounts resolve to null — treat them as signed out.
    if (!user) {
      return Response.json({ authenticated: false }, { status: 401 });
    }

    // Role comes from the row, not the token: a demotion should be visible on
    // the next request, not whenever the 7-day token happens to expire.
    return Response.json({
      authenticated: true,
      email,
      name: user.name,
      role: user.role as Role,
    });
  } catch {
    return Response.json({ authenticated: false }, { status: 401 });
  }
}
