import { Controller, Headers, HttpCode, HttpStatus, Post, type RawBodyRequest, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { DonationsService } from "./donations.service";

/**
 * Webhook Stripe. Chữ ký `Stripe-Signature` tính trên đúng byte body gốc nên đọc
 * `req.rawBody` (bật `rawBody: true` ở `main.ts`), không dùng body đã parse JSON.
 * Khai báo trên Stripe: https://<domain>/api/v1/payments/stripe/webhook, sự kiện
 * `checkout.session.completed`. Chạy local: `stripe listen --forward-to localhost:4000/api/v1/payments/stripe/webhook`.
 */
@Controller("payments/stripe")
export class StripeWebhookController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 120, windowMs: 60_000, keyPrefix: "stripe-webhook" })
  webhook(@Req() req: RawBodyRequest<Request>, @Headers("stripe-signature") signature?: string) {
    return this.donationsService.handleStripeWebhook(req.rawBody, signature);
  }
}
