/**
 * Best-effort client IP from the x-forwarded-for header (first hop).
 * Returns null when no proxy header is present (e.g. direct localhost dev).
 */
export function clientIp(request: Request): string | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip || null;
}
