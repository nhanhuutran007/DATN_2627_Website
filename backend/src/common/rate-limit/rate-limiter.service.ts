import { Injectable, OnModuleDestroy } from "@nestjs/common";

type Window = {
  count: number;
  resetAt: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

const CLEANUP_INTERVAL_MS = 60_000;
const MAX_KEYS = 10_000;

@Injectable()
export class RateLimiterService implements OnModuleDestroy {
  private readonly windows = new Map<string, Window>();
  private readonly cleanupTimer = setInterval(
    () => this.cleanup(),
    CLEANUP_INTERVAL_MS,
  ).unref();

  consume(key: string, limit: number, windowMs: number): RateLimitDecision {
    const now = Date.now();
    let current = this.windows.get(key);
    if (!current || current.resetAt <= now) {
      current = { count: 0, resetAt: now + windowMs };
      this.windows.set(key, current);
    }

    current.count += 1;
    if (current.count > limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(0, current.resetAt - now),
      };
    }

    return { allowed: true, remaining: limit - current.count, retryAfterMs: 0 };
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, current] of this.windows) {
      if (current.resetAt <= now) {
        this.windows.delete(key);
      }
    }
    while (this.windows.size > MAX_KEYS) {
      const oldestKey = this.windows.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.windows.delete(oldestKey);
    }
  }
}