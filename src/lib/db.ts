import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

// Single Pool per process — self-hosted Postgres (Docker dev / OVH VPS prod).
// SSL is opt-in: local Postgres has no TLS; set DATABASE_SSL=true only for
// remote DBs that require it.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
});

// Set per-connection timeouts to bound deadlock wait time and runaway queries.
// deadlock_timeout: PostgreSQL checks for deadlocks after this interval (default 1s).
// lock_timeout: abort if waiting for a lock longer than this — surfaces deadlocks fast
//   instead of queuing indefinitely behind a slow/stuck transaction.
// statement_timeout: kills runaway queries so they can't monopolise a connection.
pool.on("connect", (client) => {
  client.query(`
    SET deadlock_timeout  = '1s';
    SET lock_timeout      = '5s';
    SET statement_timeout = '30s';
  `).catch((err) =>
    console.error("[db] Failed to set session timeouts:", err)
  );
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
