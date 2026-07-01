import { createLogger } from "./logger";

const log = createLogger("circuit-breaker");

type State = "CLOSED" | "OPEN" | "HALF_OPEN";

interface Options {
  name: string;
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
}

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Circuit "${name}" is OPEN — downstream unavailable`);
    this.name = "CircuitOpenError";
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
      const result = await fn();
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

// Redis: tolerate up to 5 failures before opening; try recovery after 30s
export const redisCircuit = new CircuitBreaker({
  name: "redis",
  failureThreshold: 5,
  successThreshold: 2,
  timeoutMs: 30_000,
});

// DB: stricter — 3 failures opens it; try recovery after 15s
export const dbCircuit = new CircuitBreaker({
  name: "database",
  failureThreshold: 3,
  successThreshold: 2,
  timeoutMs: 15_000,
});
