import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_META = "rate_limit_meta";

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
};

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_META, options);