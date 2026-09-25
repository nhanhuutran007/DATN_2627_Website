import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from "@nestjs/common";

import { REDIS_CLIENT } from "../redis/redis.module";

type Window = {
  count: number;
  resetAt: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

/**
 * Phần tối thiểu của client Redis mà service cần — không phụ thuộc type thật
 * của `ioredis` để test tự fake được (theo interface, có bản sandbox).
 */
export interface RedisRateLimitClient {
  readonly status: string;
  eval(
    script: string,
    numKeys: number,
    ...args: Array<string | number>
  ): Promise<unknown>;
}

const CLEANUP_INTERVAL_MS = 60_000;
const MAX_KEYS = 10_000;

// INCR nguyên tử + chỉ PEXPIRE ở lần đầu (count === 1) để không reset window
// mỗi lần có request mới; trả về [count, ttl còn lại] trong 1 round-trip.
const CONSUME_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if tonumber(current) == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {current, ttl}
`;

@Injectable()
export class RateLimiterService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly windows = new Map<string, Window>();
  private readonly cleanupTimer = setInterval(
    () => this.cleanup(),
    CLEANUP_INTERVAL_MS,
  ).unref();
  private redisWarningLogged = false;

  constructor(
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redis?: RedisRateLimitClient,
  ) {}

  /**
   * Dùng Redis khi sẵn sàng (phân tán được giữa nhiều instance backend); lỗi
   * hoặc chưa kết nối thì rơi về bộ đếm trong bộ nhớ của instance hiện tại —
   * rate limit là lớp phòng thủ bổ sung, không fail-closed nghiệp vụ chính.
   */
  async consume(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitDecision> {
    if (this.redis?.status === "ready") {
      try {
        return await this.consumeRedis(this.redis, key, limit, windowMs);
      } catch (error) {
        if (!this.redisWarningLogged) {
          this.logger.warn(
            `Redis rate limit lỗi, rơi về bộ nhớ tạm thời: ${error instanceof Error ? error.message : String(error)}`,
          );
          this.redisWarningLogged = true;
        }
      }
    }
    return this.consumeMemory(key, limit, windowMs);
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }

  private async consumeRedis(
    redis: RedisRateLimitClient,
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitDecision> {
    const [count, ttl] = (await redis.eval(
      CONSUME_SCRIPT,
      1,
      `ratelimit:${key}`,
      windowMs,
    )) as [number, number];

    this.redisWarningLogged = false;
    if (count > limit) {
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, ttl) };
    }
    return { allowed: true, remaining: limit - count, retryAfterMs: 0 };
  }

  private consumeMemory(
    key: string,
    limit: number,
    windowMs: number,
  ): RateLimitDecision {
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
