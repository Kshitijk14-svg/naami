import { sql } from "drizzle-orm";
import { db, dbRead, pools } from "@/lib/db";
import { redisPing } from "@/lib/redis";
import { redisCircuit, dbCircuit } from "@/lib/circuitBreaker";
import { createLogger } from "@/lib/logger";

// Readiness probe: can this instance actually serve traffic? Checks the hard
// dependency (Postgres primary) and reports the state of soft dependencies
// (read replica, Redis). Since Redis is fail-open, its being down degrades but
// does not fail readiness — only a dead primary DB returns 503.

export const dynamic = "force-dynamic";

const log = createLogger("health-ready");

async function pingPrimary(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (err) {
    log.error("primary DB check failed", { err });
    return false;
  }
}

async function pingReplica(): Promise<"ok" | "down" | "not-configured"> {
  if (!pools.replica) return "not-configured";
  try {
    await dbRead.execute(sql`SELECT 1`);
    return "ok";
  } catch (err) {
    log.error("replica DB check failed", { err });
    return "down";
  }
}

export async function GET() {
  const [primaryOk, replica, redis] = await Promise.all([
    pingPrimary(),
    pingReplica(),
    redisPing(),
  ]);

  const checks = {
    primaryDb: primaryOk ? "ok" : "down",
    replicaDb: replica,
    redis,
    circuits: {
      database: dbCircuit.getState(),
      redis: redisCircuit.getState(),
    },
  };

  // Ready iff the source of truth is reachable. Redis/replica issues are degraded,
  // not down, because reads fall back to the primary and Redis fails open.
  const ready = primaryOk;
  const degraded = redis !== "ok" || replica === "down";
  const status = !ready ? "unavailable" : degraded ? "degraded" : "ok";

  return Response.json({ status, checks }, { status: ready ? 200 : 503 });
}
