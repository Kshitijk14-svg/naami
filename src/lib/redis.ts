import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { redisCircuit, CircuitOpenError } from "./circuitBreaker";

// ─── Client singleton ─────────────────────────────────────────────────────────

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

// ─── Quota detection ──────────────────────────────────────────────────────────
// Upstash throws with "max daily request limit" when the free-tier is exhausted.

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.toLowerCase().includes("max daily request limit");
}

// ─── Quota-aware wrappers ─────────────────────────────────────────────────────

export async function redisGet<T>(key: string): Promise<T | null> {
  try {
    return await redisCircuit.call(async () => {
      try {
        return await getRedis().get<T>(key);
      } catch (err) {
        if (isQuotaError(err)) {
          console.warn("[redis] Daily quota exceeded — treating as cache miss");
          return null;
        }
        throw err;
      }
    });
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      console.warn("[redis] Circuit open — treating as cache miss");
    } else {
      // Connection/DNS/timeout errors must never take down the request path —
      // the circuit breaker has already recorded this failure; fall through to DB.
      console.warn("[redis] Read failed — treating as cache miss:", err);
    }
    return null;
  }
}

export async function redisSet(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  try {
    await redisCircuit.call(async () => {
      try {
        if (ttlSeconds) {
          await getRedis().setex(key, ttlSeconds, value);
        } else {
          await getRedis().set(key, value);
        }
      } catch (err) {
        if (isQuotaError(err)) {
          console.warn("[redis] Daily quota exceeded — cache write skipped");
          return;
        }
        throw err;
      }
    });
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      console.warn("[redis] Circuit open — cache write skipped");
    } else {
      console.warn("[redis] Write failed — cache write skipped:", err);
    }
  }
}

export async function redisDel(...keys: string[]): Promise<void> {
  try {
    await redisCircuit.call(async () => {
      try {
        await getRedis().del(...keys);
      } catch (err) {
        if (isQuotaError(err)) {
          console.warn("[redis] Daily quota exceeded — cache invalidation skipped");
          return;
        }
        throw err;
      }
    });
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      console.warn("[redis] Circuit open — cache invalidation skipped");
    } else {
      console.warn("[redis] Delete failed — cache invalidation skipped:", err);
    }
  }
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────

export type RateLimitWindow = "10 s" | "1 m" | "5 m" | "10 m" | "1 h";

const limiterCache = new Map<string, Ratelimit>();

function getLimiter(requests: number, window: RateLimitWindow): Ratelimit {
  const key = `${requests}:${window}`;
  if (!limiterCache.has(key)) {
    limiterCache.set(
      key,
      new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(requests, window),
        analytics: false,
      })
    );
  }
  return limiterCache.get(key)!;
}

/**
 * Check rate limit for the given identifier.
 * Returns null on Redis quota error — callers MUST treat null as "fail open"
 * (allow the request) rather than blocking it.
 */
export async function checkRateLimit(
  identifier: string,
  config: { requests: number; window: RateLimitWindow }
): Promise<{ limited: boolean; remaining: number; reset: number } | null> {
  try {
    return await redisCircuit.call(async () => {
      try {
        const limiter = getLimiter(config.requests, config.window);
        const { success, remaining, reset } = await limiter.limit(identifier);
        return { limited: !success, remaining, reset };
      } catch (err) {
        if (isQuotaError(err)) {
          console.warn("[redis] Rate limit quota exceeded — failing open");
          return null;
        }
        throw err;
      }
    });
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      console.warn("[redis] Circuit open — rate limit failing open");
    } else {
      console.warn("[redis] Rate limit check failed — failing open:", err);
    }
    return null;
  }
}
