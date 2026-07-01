// Standalone jobs worker. Polls the app's internal process-jobs endpoint on an
// interval so async jobs (order emails, low-stock alerts) get delivered with
// retries. Dependency-free (uses global fetch) so it needs no build step — run
// it under PM2 (see ecosystem.config.js) or any process manager.
//
//   JOBS_WORKER_SECRET=...  PORT=3000  WORKER_INTERVAL_MS=30000  node scripts/jobs-worker.mjs

const PORT = process.env.PORT ?? 3000;
const BASE_URL = process.env.WORKER_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const SECRET = process.env.JOBS_WORKER_SECRET;
const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 30_000);

if (!SECRET) {
  console.error("[jobs-worker] JOBS_WORKER_SECRET is not set — refusing to start");
  process.exit(1);
}

let running = false;

async function tick() {
  if (running) return; // never overlap runs
  running = true;
  try {
    const res = await fetch(`${BASE_URL}/api/internal/process-jobs`, {
      method: "POST",
      headers: { "x-worker-secret": SECRET },
    });
    if (!res.ok) {
      console.error(`[jobs-worker] endpoint returned ${res.status}`);
    }
  } catch (err) {
    console.error("[jobs-worker] request failed:", err?.message ?? err);
  } finally {
    running = false;
  }
}

console.log(`[jobs-worker] polling ${BASE_URL} every ${INTERVAL_MS}ms`);
setInterval(tick, INTERVAL_MS);
tick();
