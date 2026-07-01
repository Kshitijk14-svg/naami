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

    const { payload } = await jwtVerify(token, getJwtSecret());
    const email = payload.email as string;
    const user = await getUserByEmail(email);

    return Response.json({
      authenticated: true,
      email,
      name: user?.name,
      role: payload.role as Role,
    });
  } catch {
    return Response.json({ authenticated: false }, { status: 401 });
  }
}
