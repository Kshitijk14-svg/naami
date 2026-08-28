import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(
  `INSERT INTO design_settings (key, value, updated_at) VALUES ('shared_moments_enabled', 'true', now())
   ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = now()`
);
await pool.end();

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const res = await fetch(`${url}/del/design:settings`, {
  headers: { Authorization: `Bearer ${token}` },
});
console.log("cache invalidation:", await res.json());
console.log("done: shared_moments_enabled = true");
