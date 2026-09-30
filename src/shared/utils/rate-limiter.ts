type Window = { count: number; resetAt: number };

export type RateLimitResult = { allowed: boolean; retryAfterMs: number };

/**
 * In-process fixed-window counter. `hit` checks and increments synchronously,
 * so concurrent requests cannot slip past the limit between the two steps.
 * Counters live in memory and are per API instance.
 */
export class FixedWindowRateLimiter {
  private readonly windows = new Map<string, Window>();
  private nextSweepAt = 0;

  constructor(private readonly now: () => number = Date.now) {}

  hit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = this.now();
    this.sweep(now);

    let window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + windowMs };
      this.windows.set(key, window);
    }

    window.count += 1;

    return {
      allowed: window.count <= limit,
      retryAfterMs: window.count <= limit ? 0 : window.resetAt - now,
    };
  }

  reset(key: string) {
    this.windows.delete(key);
  }

  private sweep(now: number) {
    if (now < this.nextSweepAt) {
      return;
    }

    this.nextSweepAt = now + 60_000;
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) {
        this.windows.delete(key);
      }
    }
  }
}
