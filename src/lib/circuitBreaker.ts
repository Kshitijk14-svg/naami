import { createLogger } from "./logger";

const log = createLogger("circuit-breaker");

type State = "CLOSED" | "OPEN" | "HALF_OPEN";

interface Options {
  name: string;
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
  // Hard ceiling on a single call to fn(). Without this, a hung downstream
  // (e.g. Redis unreachable, no response ever arriving) blocks forever —
  // failureThreshold/timeoutMs alone only govern how long the circuit stays
  // OPEN, not how long any individual attempt is allowed to take before
  // that decision can even be made.
  callTimeoutMs: number;
}

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Circuit "${name}" is OPEN — downstream unavailable`);
    this.name = "CircuitOpenError";
  }
}

export class CircuitCallTimeoutError extends Error {
  constructor(name: string, ms: number) {
    super(`Circuit "${name}" call exceeded ${ms}ms`);
    this.name = "CircuitCallTimeoutError";
  }
}

export class CircuitBreaker {
  private state: State = "CLOSED";
  private failures = 0;
  private successes = 0;
  private reopenAt = 0;

  constructor(private readonly opts: Options) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() < this.reopenAt) {
        throw new CircuitOpenError(this.opts.name);
      }
      this.state = "HALF_OPEN";
      this.successes = 0;
    }

    try {
      const result = await this.withTimeout(fn());
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  getState(): State {
    return this.state;
  }

  // Races fn() against a deadline. Doesn't cancel the underlying call (the
  // Upstash/pg client keeps retrying in the background) -- it only stops the
  // caller from waiting on it, which is what actually fixes user-facing
  // latency: a stuck call now fails fast into recordFailure() instead of
  // blocking a request for however long the SDK's own retries take.
  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new CircuitCallTimeoutError(this.opts.name, this.opts.callTimeoutMs));
      }, this.opts.callTimeoutMs);

      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  private recordSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.successes++;
      if (this.successes >= this.opts.successThreshold) {
        this.state = "CLOSED";
        this.failures = 0;
        this.successes = 0;
        log.info("closed — downstream recovered", { name: this.opts.name });
      }
    } else {
      this.failures = 0;
    }
  }

  private recordFailure(): void {
    this.failures++;
    if (this.failures >= this.opts.failureThreshold) {
      this.state = "OPEN";
      this.reopenAt = Date.now() + this.opts.timeoutMs;
      log.warn("opened — downstream unhealthy", {
        name: this.opts.name,
        failures: this.failures,
        retryInSeconds: this.opts.timeoutMs / 1000,
      });
    }
  }
}

// Redis: tolerate up to 5 failures before opening; try recovery after 30s.
// callTimeoutMs: a healthy Upstash REST call normally returns in well under
// this; capping it here also bounds the SDK's own internal retry/backoff
// loop (which has no timeout of its own and can otherwise run to ~12s+
// before giving up on a single logical call).
export const redisCircuit = new CircuitBreaker({
  name: "redis",
  failureThreshold: 5,
  successThreshold: 2,
  timeoutMs: 30_000,
  callTimeoutMs: 1_500,
});

// DB: stricter — 3 failures opens it; try recovery after 15s.
// callTimeoutMs sits above the pg pool's own connectionTimeoutMillis (5s,
// src/lib/db.ts) so it never preempts a legitimately-slow connection
// attempt, and well below statement_timeout (30s) so a hung *query* still
// fails the circuit fast instead of tying up a request for half a minute.
export const dbCircuit = new CircuitBreaker({
  name: "database",
  failureThreshold: 3,
  successThreshold: 2,
  timeoutMs: 15_000,
  callTimeoutMs: 6_000,
});
