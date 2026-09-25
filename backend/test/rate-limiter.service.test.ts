import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";

import {
  RateLimiterService,
  RedisRateLimitClient,
} from "../src/common/rate-limit/rate-limiter.service";

describe("RateLimiterService", () => {
  describe("consume (in-memory, không có Redis)", () => {
    it("should allow requests up to the limit", async () => {
      const limiter = new RateLimiterService();
      for (let i = 0; i < 3; i += 1) {
        const decision = await limiter.consume("ip:1", 3, 60_000);
        ok(decision.allowed);
        equal(decision.remaining, 3 - i - 1);
      }
    });

    it("should block requests beyond the limit with a retry window", async () => {
      const limiter = new RateLimiterService();
      for (let i = 0; i < 3; i += 1) {
        await limiter.consume("ip:2", 3, 60_000);
      }
      const blocked = await limiter.consume("ip:2", 3, 60_000);
      ok(!blocked.allowed);
      ok(blocked.retryAfterMs > 0);
      ok(blocked.retryAfterMs <= 60_000);
    });

    it("should isolate keys from each other", async () => {
      const limiter = new RateLimiterService();
      await limiter.consume("ip:a", 1, 60_000);
      const decision = await limiter.consume("ip:b", 1, 60_000);
      ok(decision.allowed);
    });

    it("should be silent about it", async () => {
      const limiter = new RateLimiterService();
      const decision = await limiter.consume("ip:c", 1, 60_000);
      ok(decision.allowed);
      equal(decision.retryAfterMs, 0);
    });
  });

  describe("reset", () => {
    it("should clear the window for a key", async () => {
      const limiter = new RateLimiterService();
      await limiter.consume("ip:d", 1, 60_000);
      ok(!(await limiter.consume("ip:d", 1, 60_000)).allowed);
      limiter.reset("ip:d");
      ok((await limiter.consume("ip:d", 1, 60_000)).allowed);
    });
  });

  describe("onModuleDestroy", () => {
    it("should not throw when destroyed", () => {
      const limiter = new RateLimiterService();
      limiter.onModuleDestroy();
      ok(true);
    });
  });

  describe("consume (Redis giả)", () => {
    function fakeRedis(overrides: Partial<RedisRateLimitClient> = {}): RedisRateLimitClient {
      return {
        status: "ready",
        eval: async () => [1, 60_000],
        ...overrides,
      };
    }

    it("should use the Redis path when the client is ready", async () => {
      let calls = 0;
      const redis = fakeRedis({
        eval: async () => {
          calls += 1;
          return [2, 45_000];
        },
      });
      const limiter = new RateLimiterService(redis);
      const decision = await limiter.consume("ip:redis-1", 5, 60_000);
      equal(calls, 1);
      ok(decision.allowed);
      equal(decision.remaining, 3);
    });

    it("should block once the Redis counter passes the limit", async () => {
      const redis = fakeRedis({ eval: async () => [6, 30_000] });
      const limiter = new RateLimiterService(redis);
      const decision = await limiter.consume("ip:redis-2", 5, 60_000);
      ok(!decision.allowed);
      equal(decision.retryAfterMs, 30_000);
    });

    it("should fall back to in-memory when the Redis client is not ready", async () => {
      const redis = fakeRedis({ status: "connecting" });
      const limiter = new RateLimiterService(redis);
      const decision = await limiter.consume("ip:redis-3", 3, 60_000);
      ok(decision.allowed);
      equal(decision.remaining, 2);
    });

    it("should fall back to in-memory when Redis throws", async () => {
      const redis = fakeRedis({
        eval: async () => {
          throw new Error("connection reset");
        },
      });
      const limiter = new RateLimiterService(redis);
      const decision = await limiter.consume("ip:redis-4", 3, 60_000);
      ok(decision.allowed);
      equal(decision.remaining, 2);
    });
  });
});
