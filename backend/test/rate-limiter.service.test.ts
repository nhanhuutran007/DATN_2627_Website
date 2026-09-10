import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";

import { RateLimiterService } from "../src/common/rate-limit/rate-limiter.service";

describe("RateLimiterService", () => {
  describe("consume", () => {
    it("should allow requests up to the limit", () => {
      const limiter = new RateLimiterService();
      for (let i = 0; i < 3; i += 1) {
        const decision = limiter.consume("ip:1", 3, 60_000);
        ok(decision.allowed);
        equal(decision.remaining, 3 - i - 1);
      }
    });

    it("should block requests beyond the limit with a retry window", () => {
      const limiter = new RateLimiterService();
      for (let i = 0; i < 3; i += 1) {
        limiter.consume("ip:2", 3, 60_000);
      }
      const blocked = limiter.consume("ip:2", 3, 60_000);
      ok(!blocked.allowed);
      ok(blocked.retryAfterMs > 0);
      ok(blocked.retryAfterMs <= 60_000);
    });

    it("should isolate keys from each other", () => {
      const limiter = new RateLimiterService();
      limiter.consume("ip:a", 1, 60_000);
      const decision = limiter.consume("ip:b", 1, 60_000);
      ok(decision.allowed);
    });

    it("should be silent about it", () => {
      const limiter = new RateLimiterService();
      const decision = limiter.consume("ip:c", 1, 60_000);
      ok(decision.allowed);
      equal(decision.retryAfterMs, 0);
    });
  });

  describe("reset", () => {
    it("should clear the window for a key", () => {
      const limiter = new RateLimiterService();
      limiter.consume("ip:d", 1, 60_000);
      ok(!limiter.consume("ip:d", 1, 60_000).allowed);
      limiter.reset("ip:d");
      ok(limiter.consume("ip:d", 1, 60_000).allowed);
    });
  });

  describe("onModuleDestroy", () => {
    it("should not throw when destroyed", () => {
      const limiter = new RateLimiterService();
      limiter.onModuleDestroy();
      ok(true);
    });
  });
});