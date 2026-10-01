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
import { RolesGuard } from "../auth/guards/roles.guard";
import { USER_PRIVATE_GROUP, User, UserRole } from "../users/entities/user.entity";
import {
  CreateRefundRequestDto,
  DirectRefundDto,
  ReconciliationQueryDto,
  RefundQueryDto,
  ReviewRefundDto,
} from "./dto/finance.dto";
import { FinanceService } from "./finance.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  /** Người ủng hộ yêu cầu hoàn một khoản của mình (admin duyệt). */
  @Post("donations/:id/refund-request")
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 60 * 60_000, keyPrefix: "refund-request" })
  requestRefund(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateRefundRequestDto,
    @GetCurrentUser() user: User,
  ) {
    return this.financeService.requestRefund(id, dto.reason, user);
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

  @Patch("refunds/:id/approve")
  approve(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ReviewRefundDto, @GetCurrentUser() admin: User) {
    return this.financeService.approve(id, dto.adminNotes, admin);
  }

  @Patch("refunds/:id/reject")
  reject(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ReviewRefundDto, @GetCurrentUser() admin: User) {
    return this.financeService.reject(id, dto.adminNotes, admin);
  }

  /** Admin hoàn trực tiếp (vd. phát hiện gian lận), bắt buộc lý do. */
  @Post("donations/:id/refund")
  refund(@Param("id", ParseUUIDPipe) id: string, @Body() dto: DirectRefundDto, @GetCurrentUser() admin: User) {
    return this.financeService.refundDonation(id, dto.reason, admin);
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
