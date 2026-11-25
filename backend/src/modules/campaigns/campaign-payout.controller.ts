import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from "@nestjs/common";

import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { StepUpPurpose } from "../auth/entities/step-up-code.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NonAdminGuard } from "../auth/guards/non-admin.guard";
import { RequireStepUp, StepUpGuard } from "../auth/guards/step-up.guard";
import { RefundBankInfoDto } from "../finance/dto/finance.dto";
import { User } from "../users/entities/user.entity";
import { CampaignPayoutService } from "./campaign-payout.service";

/** Tài khoản đã khai báo ở các chiến dịch trước của chính mình (gợi ý dùng lại khi tạo chiến dịch). */
@Controller("campaigns/payout-accounts")
@UseGuards(JwtAuthGuard)
export class MyPayoutAccountsController {
  constructor(private readonly payoutService: CampaignPayoutService) {}

  @Get("mine")
  mine(@GetCurrentUser() user: User) {
    return this.payoutService.listMine(user);
  }
}

/** Tài khoản ngân hàng nhận tiền gây quỹ: chủ dự án khai báo, admin xem để chuyển khoản. */
@Controller("campaigns/:id/payout-account")
@UseGuards(JwtAuthGuard)
export class CampaignPayoutController {
  constructor(private readonly payoutService: CampaignPayoutService) {}

  @Get()
  async get(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    const account = await this.payoutService.get(id, user);
    return { account, disbursement: await this.payoutService.disbursement(id, user) };
  }

  /** Cần mã OTP gửi email (đổi nơi nhận tiền). */
  @Put()
  @UseGuards(NonAdminGuard, StepUpGuard)
  @RequireStepUp(StepUpPurpose.CAMPAIGN_PAYOUT)
  set(@Param("id", ParseUUIDPipe) id: string, @Body() dto: RefundBankInfoDto, @GetCurrentUser() user: User) {
    return this.payoutService.set(id, dto, user);
  }
}
