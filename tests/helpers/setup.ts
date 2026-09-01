/**
 * Runs before any test module is imported.
 *
 * Two jobs, in this order:
 *
 *   1. Load .env.local. This CANNOT be done inside a test file, because ESM
 *      hoists every `import` above the first statement — so `@/lib/db` would
 *      construct its connection pool before the env was populated. A setup file
 *      is evaluated first, which is the only reliable hook.
 *
 *      We parse the file directly rather than using @next/env, because Next
 *      deliberately skips .env.local when NODE_ENV is "test" — which is exactly
 *      what vitest sets.
 *
 *   2. Refuse to run against anything that is not localhost. These suites set
 *      stock to 1, insert checkout intents, forge HMAC signatures and create
 *      users. Pointed at production they would corrupt real inventory and orders.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(name: string): void {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    // Strip one layer of matching quotes, as dotenv does.
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }

    // A real environment variable always wins, so CI can override the file.
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env.test.local");
loadEnvFile(".env.local");

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Tests need a local Postgres — see docs/testing/00-setup.md."
  );
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

function hostOf(connectionString: string): string {
  try {
    return new URL(connectionString).hostname.replace(/^\[|\]$/g, "");
  } catch {
    // An unparseable URL is not something we can vouch for.
    return "";
  }
}

const host = hostOf(url);

if (!LOCAL_HOSTS.has(host)) {
  throw new Error(
    [
      "",
      "  REFUSING TO RUN.",
      "",
      `  DATABASE_URL points at "${host || "an unparseable host"}", not localhost.`,
      "",
      "  These tests are destructive: they set stock to 1, insert checkout",
      "  intents, forge payment signatures and create users. Running them",
      "  against a shared or production database will corrupt real data.",
      "",
      "  Point DATABASE_URL at a local, disposable Postgres and try again.",
      "",
    ].join("\n")
  );
}
