import { stableHash } from "./cache.ts";

/**
 * This limiter is intentionally a local-development safety net, not a
 * production security boundary. Each Cloudflare Worker isolate has independent
 * memory and cold starts clear state, so production deployments must enforce a
 * distributed limit at the edge before requests reach this fallback.
 */
export const RATE_LIMITER_LIMITATION =
  "In-memory counters are per isolate, reset on cold start, and are not a distributed production enforcement boundary.";

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAtEpochSeconds: number;
  readonly retryAfterSeconds: number;
}

export interface InMemoryRateLimiterOptions {
  readonly limit: number;
  readonly windowMs: number;
  readonly maxEntries: number;
  readonly now?: () => number;
}

interface WindowState {
  count: number;
  resetAtMs: number;
}

export class InMemoryRateLimiter {
  readonly #limit: number;
  readonly #windowMs: number;
  readonly #maxEntries: number;
  readonly #now: () => number;
  readonly #windows = new Map<string, WindowState>();

  public constructor(options: InMemoryRateLimiterOptions) {
    if (
      !Number.isInteger(options.limit) ||
      options.limit < 1 ||
      !Number.isInteger(options.windowMs) ||
      options.windowMs < 1 ||
      !Number.isInteger(options.maxEntries) ||
      options.maxEntries < 1
    ) {
      throw new RangeError("Rate limiter options must be positive integers.");
    }

    this.#limit = options.limit;
    this.#windowMs = options.windowMs;
    this.#maxEntries = options.maxEntries;
    this.#now = options.now ?? Date.now;
  }

  public consume(key: string): RateLimitDecision {
    const now = this.#now();
    let window = this.#windows.get(key);

    if (!window || window.resetAtMs <= now) {
      this.#makeRoom(now);
      window = { count: 0, resetAtMs: now + this.#windowMs };
      this.#windows.set(key, window);
    }

    if (window.count >= this.#limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((window.resetAtMs - now) / 1_000),
      );
      return {
        allowed: false,
        limit: this.#limit,
        remaining: 0,
        resetAtEpochSeconds: Math.ceil(window.resetAtMs / 1_000),
        retryAfterSeconds,
      };
    }

    window.count += 1;
    return {
      allowed: true,
      limit: this.#limit,
      remaining: this.#limit - window.count,
      resetAtEpochSeconds: Math.ceil(window.resetAtMs / 1_000),
      retryAfterSeconds: 0,
    };
  }

  #makeRoom(now: number): void {
    if (this.#windows.size < this.#maxEntries) return;

    for (const [key, window] of this.#windows) {
      if (window.resetAtMs <= now) this.#windows.delete(key);
    }

    while (this.#windows.size >= this.#maxEntries) {
      const oldestKey = this.#windows.keys().next().value;
      if (typeof oldestKey !== "string") break;
      this.#windows.delete(oldestKey);
    }
  }
}

const localApiLimiter = new InMemoryRateLimiter({
  limit: 60,
  windowMs: 60_000,
  maxEntries: 10_000,
});

function firstForwardedAddress(value: string | null): string | undefined {
  const first = value?.split(",", 1)[0]?.trim();
  return first || undefined;
}

export function requestRateLimitKey(request: Request): string {
  const clientAddress =
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    firstForwardedAddress(request.headers.get("x-forwarded-for")) ||
    "anonymous-local-client";

  return stableHash(clientAddress);
}

export function consumeApiRateLimit(request: Request): RateLimitDecision {
  return localApiLimiter.consume(requestRateLimitKey(request));
}
