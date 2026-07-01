// Centralized structured logger. Emits one JSON line per event so logs can be
// grepped locally and shipped to an aggregator (Loki/Datadog/etc.) in prod.
// Every call site should use this instead of console.* so the format, level
// filtering, and secret redaction stay in one place.

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

// LOG_LEVEL gates output; defaults to debug in dev, info in prod.
const MIN_LEVEL: Level =
  (process.env.LOG_LEVEL as Level) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

// Keys whose values must never hit the logs, at any nesting depth.
const REDACT_KEYS = new Set([
  "password",
  "passwordhash",
  "password_hash",
  "token",
  "otp",
  "code",
  "authorization",
  "cookie",
  "jwt",
  "secret",
  "razorpaysignature",
  "razorpay_signature",
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACT_KEYS.has(k.toLowerCase()) ? "[redacted]" : redact(v, depth + 1);
  }
  return out;
}

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return err;
}

function emit(level: Level, scope: string, msg: string, context?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    scope,
    msg,
    ...(context ? (redact(context) as Record<string, unknown>) : {}),
  };

  const line = JSON.stringify(entry, (_k, v) =>
    v instanceof Error ? serializeError(v) : v
  );

  // stderr for warn/error, stdout otherwise — plays nicely with log collectors.
  if (level === "error" || level === "warn") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

export interface Logger {
  debug(msg: string, context?: Record<string, unknown>): void;
  info(msg: string, context?: Record<string, unknown>): void;
  warn(msg: string, context?: Record<string, unknown>): void;
  error(msg: string, context?: Record<string, unknown>): void;
}

/**
 * Create a scoped logger, e.g. `const log = createLogger("verify-payment")`.
 * The scope replaces the old `[handler-name]` console prefixes.
 */
export function createLogger(scope: string): Logger {
  return {
    debug: (msg, ctx) => emit("debug", scope, msg, ctx),
    info: (msg, ctx) => emit("info", scope, msg, ctx),
    warn: (msg, ctx) => emit("warn", scope, msg, ctx),
    error: (msg, ctx) => emit("error", scope, msg, ctx),
  };
}

// Default app-wide logger for call sites that don't need their own scope.
export const logger = createLogger("app");
