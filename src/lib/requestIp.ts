/**
 * Client IP, resolved so that a client cannot choose it.
 *
 * The previous implementation returned the FIRST entry of X-Forwarded-For.
 * That entry is whatever the client sent: nginx uses `proxy_add_x_forwarded_for`,
 * which *appends* the real peer rather than replacing the header, so a request
 * carrying `X-Forwarded-For: 1.2.3.4` arrives as `1.2.3.4, <real ip>` and the
 * first hop is the attacker's own string. Every per-IP control read that value —
 * login throttling, OTP send/verify limits, the coupon-code limiter, and the
 * per-IP coupon redemption cap — so all of them could be defeated by rotating a
 * header. Omitting the header entirely returned null, which made the per-IP
 * coupon check skip itself altogether.
 *
 * Resolution order:
 *   1. X-Real-IP — set by our nginx to $remote_addr (deploy/nginx.conf), so it
 *      is the actual peer and cannot be forged past the proxy.
 *   2. The LAST X-Forwarded-For entry — the hop our own proxy appended.
 *      Anything a client injects sits to the left of it.
 *
 * TRUSTED_PROXY_HOPS lets a deployment behind additional proxies (a CDN, a load
 * balancer) count back further from the right.
 */

function trustedHops(): number {
  const raw = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}

export function clientIp(request: Request): string | null {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    if (hops.length > 0) {
      // Count in from the right: the rightmost entries were appended by
      // infrastructure we control, everything left of them is client-supplied.
      const index = Math.max(0, hops.length - trustedHops());
      return hops[index] ?? null;
    }
  }

  return null;
}

/**
 * Same value, but never null — for rate-limit keys, where an absent IP must not
 * silently disable the limit. Falls back to the supplied identity (e.g. the
 * session email) and finally to a shared bucket.
 */
export function rateLimitKey(request: Request, fallback?: string | null): string {
  return clientIp(request) ?? fallback ?? "unknown";
}
