import { equal } from "node:assert/strict";
import { describe, it } from "node:test";

import type Redis from "ioredis";

import { RedisModule } from "../src/common/redis/redis.module";

function fakeClient(status: string, quitFails = false) {
  const calls = { quit: 0, disconnect: 0 };
  const client = {
    status,
    quit: async () => {
      calls.quit += 1;
      if (quitFails) {
        throw new Error("Connection is closed.");
      }
      return "OK";
    },
    disconnect: () => {
      calls.disconnect += 1;
    },
  } as unknown as Redis;
  return { client, calls };
}

describe("RedisModule", () => {
  it("should quit the Redis client on application shutdown", async () => {
    const { client, calls } = fakeClient("ready");
    await new RedisModule(client).onApplicationShutdown();
    equal(calls.quit, 1);
    equal(calls.disconnect, 0);
  });

  it("should force disconnect when quit fails", async () => {
    const { client, calls } = fakeClient("reconnecting", true);
    await new RedisModule(client).onApplicationShutdown();
    equal(calls.quit, 1);
    equal(calls.disconnect, 1);
  });

  it("should skip when there is no client or it already ended", async () => {
    await new RedisModule(undefined).onApplicationShutdown();
    const { client, calls } = fakeClient("end");
    await new RedisModule(client).onApplicationShutdown();
    equal(calls.quit, 0);
  });
});
