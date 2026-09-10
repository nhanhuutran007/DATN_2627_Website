import { Global, Module } from "@nestjs/common";

import { RateLimitGuard } from "./rate-limit.guard";
import { RateLimiterService } from "./rate-limiter.service";

@Global()
@Module({
  providers: [RateLimiterService, RateLimitGuard],
  exports: [RateLimiterService, RateLimitGuard],
})
export class RateLimitModule {}

export { RateLimitOptions, RateLimit } from "./rate-limit.decorator";
export { RateLimiterService } from "./rate-limiter.service";
export { RateLimitGuard } from "./rate-limit.guard";