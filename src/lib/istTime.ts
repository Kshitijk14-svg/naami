// IST (Asia/Kolkata) helpers for admin datetime fields. IST is a fixed +05:30
// offset with no DST, so simple arithmetic is safe — no timezone library needed.
// Values are stored in the DB as UTC (timestamptz); IST is purely presentational.

const IST_OFFSET_MS = 330 * 60 * 1000; // +05:30

/** UTC ISO string (or Date) → value for an <input type="datetime-local"> shown as IST. */
export function utcToIstInput(utc: string | Date | null | undefined): string {
  if (!utc) return "";
  const d = typeof utc === "string" ? new Date(utc) : utc;
  if (isNaN(d.getTime())) return "";
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
}

/** datetime-local value (interpreted as IST) → UTC ISO string, or null if empty. */
export function istInputToUtc(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}:00+05:30`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** Human-readable IST rendering for read-only display. */
export function formatIst(utc: string | Date | null | undefined): string {
  if (!utc) return "—";
  const d = typeof utc === "string" ? new Date(utc) : utc;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
