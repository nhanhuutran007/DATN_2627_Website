import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NonAdminGuard } from "../auth/guards/non-admin.guard";
import { User } from "../users/entities/user.entity";
import { MAX_TOPUP, MIN_TOPUP, WalletService } from "./wallet.service";

export class CreateTopupDto {
  @Type(() => Number)
  @IsInt()
  @Min(MIN_TOPUP)
  @Max(MAX_TOPUP)
  amount!: number;
}

/** Ví Góp Mầm của người đang đăng nhập: số dư, lịch sử và nạp tiền qua SePay. */
@Controller("wallet")
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get("me")
  me(@GetCurrentUser() user: User) {
    return this.walletService.getMine(user);
  }

  /** Chỉ số dư (header gọi trên mọi trang, không kèm lịch sử). */
  @Get("summary")
  summary(@GetCurrentUser() user: User) {
    return this.walletService.summary(user.id);
  }

  @Get("topups")
  topups(@GetCurrentUser() user: User) {
    return this.walletService.listTopups(user);
  }

  @Post("topups")
  @UseGuards(NonAdminGuard, RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 10 * 60_000, keyPrefix: "wallet-topup" })
  create(@Body() dto: CreateTopupDto, @GetCurrentUser() user: User) {
    return this.walletService.createTopup(user, dto.amount);
  }

  @Post("topups/:id/checkout")
  @HttpCode(HttpStatus.OK)
  checkout(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.walletService.checkout(id, user);
  }

  /** Hỏi lại SePay khi IPN chưa tới. */
  @Post("topups/:id/sync")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 60_000, keyPrefix: "wallet-topup-sync" })
  sync(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.walletService.syncTopup(id, user);
  }

  /** Nạp thử (chỉ môi trường demo/sandbox). */
  @Post("topups/:id/demo-confirm")
  @HttpCode(HttpStatus.OK)
  demoConfirm(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.walletService.confirmDemoTopup(id, user);
  }

  @Post("topups/:id/cancel")
  @HttpCode(HttpStatus.OK)
  cancel(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.walletService.cancelTopup(id, user);
  }
}
