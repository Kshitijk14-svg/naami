import { jwtVerify } from "jose";
import { Role } from "@/models/roles";

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function verifySessionToken(
  token: string
): Promise<{ email: string; role: Role } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      email: payload.email as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}
