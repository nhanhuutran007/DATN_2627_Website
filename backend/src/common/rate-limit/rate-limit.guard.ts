import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import {
  RATE_LIMIT_META,
  type RateLimitOptions,
} from "./rate-limit.decorator";
import { RateLimiterService } from "./rate-limiter.service";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<
      RateLimitOptions | undefined
    >(RATE_LIMIT_META, [context.getHandler(), context.getClass()]);
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const ip =
      request.ip ||
      request.socket?.remoteAddress ||
      "unknown";
    const key = `${options.keyPrefix ?? "rl"}:${ip}`;
    const decision = await this.rateLimiter.consume(
      key,
      options.limit,
      options.windowMs,
    );

    (request as Request & { rateLimit?: unknown }).rateLimit = {
      limit: options.limit,
      remaining: decision.remaining,
      retryAfterMs: decision.retryAfterMs,
    };

    if (!decision.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Too many requests, please try again later",
          error: "Too Many Requests",
        },
        HttpStatus.TOO_MANY_REQUESTS,
        { cause: new Error("rate limit exceeded") },
      );
    }

    return true;
  }
}