/**
 * The single source of the signing key. `proxy.ts` and `lib/adminAuth.ts` both
 * import this — previously each had its own copy, and the proxy's tolerated a
 * missing JWT_SECRET (`?? ''`), which silently verified every token against an
 * empty key. One implementation, one failure mode.
 */
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}
