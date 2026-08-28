import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const res = await pool.query(
  "SELECT key, value FROM design_settings WHERE key LIKE 'shared_moments%' OR key = 'instagram_access_token'"
);
console.log(res.rows);
await pool.end();
