import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { DonationsService } from "./donations.service";

/**
 * IPN của cổng SePay. Body để dạng thô (không qua DTO) vì SePay gửi thêm nhiều
 * trường thẻ/khách hàng mà ValidationPipe `forbidNonWhitelisted` sẽ từ chối;
 * `parseSepayIpn` chỉ đọc đúng các trường cần thiết.
 */
@Controller("payments/sepay")
export class SepayIpnController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post("ipn")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 60, windowMs: 60_000, keyPrefix: "sepay-ipn" })
  ipn(@Body() body: Record<string, unknown>, @Headers("x-secret-key") secretKey?: string) {
    return this.donationsService.handleSepayIpn(body, secretKey);
  }
}
