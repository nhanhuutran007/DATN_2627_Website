import { Global, Inject, Module, OnApplicationShutdown, Optional } from "@nestjs/common";
import type Redis from "ioredis";

import { REDIS_CLIENT, redisClientProvider } from "./redis.provider";

@Global()
@Module({
  providers: [redisClientProvider],
  exports: [redisClientProvider],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(
    @Optional() @Inject(REDIS_CLIENT) private readonly client?: Redis,
  ) {}

  /**
   * Đóng kết nối Redis khi app dừng; nếu không, socket còn mở giữ event loop
   * và process không thoát được (vd. script dùng `createApplicationContext`).
   */
  async onApplicationShutdown(): Promise<void> {
    if (!this.client || this.client.status === "end") {
      return;
    }
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}

export { REDIS_CLIENT } from "./redis.provider";
