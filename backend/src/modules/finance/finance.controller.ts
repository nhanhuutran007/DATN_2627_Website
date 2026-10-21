import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  SerializeOptions,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NonAdminGuard } from "../auth/guards/non-admin.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RequireStepUp, StepUpGuard } from "../auth/guards/step-up.guard";
import { StepUpPurpose } from "../auth/entities/step-up-code.entity";
import { USER_PRIVATE_GROUP, User, UserRole } from "../users/entities/user.entity";
import {
  CreateRefundRequestDto,
  DirectRefundDto,
  ReconciliationQueryDto,
  RefundExportQueryDto,
  RefundQueryDto,
  ReviewRefundDto,
} from "./dto/finance.dto";
import { FinanceService } from "./finance.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  /** Người ủng hộ yêu cầu hoàn một khoản của mình (admin duyệt); kèm tài khoản nhận nên cần mã OTP. */
  @Post("donations/:id/refund-request")
  @UseGuards(NonAdminGuard, RateLimitGuard, StepUpGuard)
  @RequireStepUp(StepUpPurpose.REFUND_REQUEST)
  @RateLimit({ limit: 5, windowMs: 60 * 60_000, keyPrefix: "refund-request" })
  requestRefund(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateRefundRequestDto,
    @GetCurrentUser() user: User,
  ) {
    return this.financeService.requestRefund(id, dto, user);
  }

  @Get("refund-requests/mine")
  listMine(@GetCurrentUser() user: User) {
    return this.financeService.listMine(user);
  }
}

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@SerializeOptions({ groups: [USER_PRIVATE_GROUP] })
export class AdminFinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("refunds")
  listRefunds(@Query() query: RefundQueryDto) {
    return this.financeService.adminList(query);
  }

  /** CSV yêu cầu hoàn kèm tài khoản nhận để chuyển khoản trả lại (có dữ liệu cá nhân, ghi audit). */
  @Get("refunds/export")
  @UseGuards(StepUpGuard)
  @RequireStepUp(StepUpPurpose.ADMIN_REFUND)
  async exportRefunds(
    @Query() query: RefundExportQueryDto,
    @GetCurrentUser() admin: User,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.financeService.exportRefundsCsv(query, admin);
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "no-store",
    });
    res.send(file.content);
  }

  @Patch("refunds/:id/approve")
  @UseGuards(StepUpGuard)
  @RequireStepUp(StepUpPurpose.ADMIN_REFUND)
  approve(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ReviewRefundDto, @GetCurrentUser() admin: User) {
    return this.financeService.approve(id, dto.adminNotes, admin, dto);
  }

  @Patch("refunds/:id/reject")
  reject(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ReviewRefundDto, @GetCurrentUser() admin: User) {
    return this.financeService.reject(id, dto.adminNotes, admin);
  }

  /** Admin hoàn trực tiếp (vd. phát hiện gian lận), bắt buộc lý do. */
  @Post("donations/:id/refund")
  @UseGuards(StepUpGuard)
  @RequireStepUp(StepUpPurpose.ADMIN_REFUND)
  refund(@Param("id", ParseUUIDPipe) id: string, @Body() dto: DirectRefundDto, @GetCurrentUser() admin: User) {
    return this.financeService.refundDonation(id, dto.reason, admin, { manual: dto });
  }

  @Get("reconciliation")
  reconcile(@Query() query: ReconciliationQueryDto) {
    return this.financeService.reconcile(query);
  }

  @Get("reconciliation/export")
  async export(@Query() query: ReconciliationQueryDto, @GetCurrentUser() admin: User, @Res() res: Response): Promise<void> {
    const file = await this.financeService.exportCsv(query, admin);
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "no-store",
    });
    res.send(file.content);
  }
}
