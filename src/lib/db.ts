import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { createLogger } from "@/lib/logger";

const log = createLogger("db");

// Set per-connection timeouts to bound lock waits and runaway queries.
// lock_timeout: abort if waiting for a lock longer than this — surfaces deadlocks
//   fast instead of queuing indefinitely behind a slow/stuck transaction.
// statement_timeout: kills runaway queries so they can't monopolise a connection.
// NOTE: deadlock_timeout is intentionally NOT set here — it is superuser-only, and
// including it makes the whole statement fail for a normal (non-superuser) app
// role, which would silently drop lock_timeout/statement_timeout too. It defaults
// to 1s at the server level anyway; tune it in postgresql.conf if needed.
function applySessionTimeouts(pool: Pool) {
  pool.on("connect", (client) => {
    client
      .query(
        `
      SET lock_timeout      = '5s';
      SET statement_timeout = '30s';
    `
      )
      .catch((err) => log.error("failed to set session timeouts", { err }));
  });
}

// Primary (write) Pool — one per process. Self-hosted Postgres (Docker dev / OVH VPS
// prod). SSL is opt-in: local Postgres has no TLS; set DATABASE_SSL=true only for
// remote DBs that require it.
const primaryPool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
});
applySessionTimeouts(primaryPool);

// Read replica (read/write splitting). Optional: when DATABASE_REPLICA_URL is unset,
// reads fall back to the primary so a single-node deployment still works unchanged.
const replicaUrl = process.env.DATABASE_REPLICA_URL;
const replicaPool = replicaUrl
  ? new Pool({
      connectionString: replicaUrl,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
      max: Number(process.env.DB_POOL_MAX ?? 10),
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    })
  : null;
if (replicaPool) applySessionTimeouts(replicaPool);

// db: primary — use for ALL writes and transactions.
export const db = drizzle(primaryPool, { schema });

// dbRead: replica when configured, otherwise the primary. Use for pure reads only.
export const dbRead = replicaPool ? drizzle(replicaPool, { schema }) : db;

export type DB = typeof db;

// Exposed for the readiness probe (health check).
export const pools = { primary: primaryPool, replica: replicaPool };
