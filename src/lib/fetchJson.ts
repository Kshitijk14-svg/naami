/**
 * Fetch a JSON endpoint, rejecting on a non-2xx instead of parsing the error
 * body as though it were data.
 *
 * The admin list pages all used `.then((r) => r.json())`, so a 401 or 403
 * resolved to `{ error: "Unauthorized" }` and was handed straight to setRows().
 * CrudTable then evaluated `rows.length === 0` against undefined and called
 * `rows.map`, which threw — a session expiring while a page was open blanked
 * the screen with no explanation. Routing the failure into the existing
 * `.catch()` turns that into the error message the page already knows how to
 * show.
 */
export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      body.error ??
        (res.status === 401 || res.status === 403
          ? "Your session has expired. Please sign in again."
          : `Request failed (${res.status})`)
    );
  }
  return res.json() as Promise<T>;
}

/** The message from a rejected fetchJson, or a fallback. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
