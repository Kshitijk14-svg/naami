/**
 * Route-level suites need a running dev server. Rather than failing when one is
 * not up, they skip — so `npm test` stays useful without `npm run dev` in
 * another terminal, and gives full coverage when it is.
 */
export const BASE = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";

export async function serverIsUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Status code only — most route assertions need nothing else. */
export async function status(path: string, init?: RequestInit): Promise<number> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(10_000),
  });
  return res.status;
}

export async function json<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<{ status: number; body: T | null }> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await res.json().catch(() => null)) as T | null;
  return { status: res.status, body };
}
