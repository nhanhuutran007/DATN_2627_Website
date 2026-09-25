import { Logger, Provider } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";

const logger = new Logger("RedisClient");

/**
 * Client Redis dùng chung (rate-limit phân tán, sau này có thể dùng cho cache).
 * Không có `REDIS_URL` (máy dev không chạy Docker) → provide `undefined`, mọi
 * nơi inject client phải tự rơi về hành vi không có Redis (xem
 * `RateLimiterService`). Lỗi kết nối chỉ log, không throw — Redis là lớp tối
 * ưu, không phải phụ thuộc bắt buộc để backend chạy được.
 */
export const redisClientProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (): Redis | undefined => {
    const url = process.env.REDIS_URL;
    if (!url) {
      return undefined;
    }

    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    let loggedError = false;
    client.on("error", (error) => {
      if (!loggedError) {
        logger.warn(
          `Mất kết nối Redis, rate limit sẽ dùng bộ nhớ tạm thời: ${error.message}`,
        );
        loggedError = true;
      }
    });
    client.on("ready", () => {
      loggedError = false;
    });

    client.connect().catch((error: Error) => {
      logger.warn(`Không kết nối được Redis (${url}): ${error.message}`);
    });

    return client;
  },
};
