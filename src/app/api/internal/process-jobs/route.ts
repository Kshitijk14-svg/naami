import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { processJobs } from "@/lib/jobs";
import { purgeExpiredIdempotencyKeys } from "@/lib/idempotency";
import { createLogger } from "@/lib/logger";

// Drains the async job queue. Intended to be called on a schedule (PM2 cron,
// system cron, or an external scheduler) — NOT publicly reachable, so it is
// guarded by a shared secret rather than a user session.

export const dynamic = "force-dynamic";

const log = createLogger("process-jobs");
const WORKER_SECRET = process.env.JOBS_WORKER_SECRET;

function authorized(request: NextRequest): boolean {
  if (!WORKER_SECRET) return false;
  // Accept either "Authorization: Bearer <secret>" or "x-worker-secret: <secret>".
  const header =
    request.headers.get("x-worker-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  const a = Buffer.from(header);
  const b = Buffer.from(WORKER_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!WORKER_SECRET) {
    return Response.json({ error: "Worker not configured." }, { status: 503 });
  }
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processJobs();
    const purged = await purgeExpiredIdempotencyKeys();
    log.info("worker run complete", { ...result, purged });
    return Response.json({ ...result, purgedIdempotencyKeys: purged });
  } catch (err) {
    log.error("worker run failed", { err });
    return Response.json({ error: "Worker run failed." }, { status: 500 });
  }
}
