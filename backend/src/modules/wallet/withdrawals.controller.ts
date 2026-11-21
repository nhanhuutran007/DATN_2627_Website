import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Transform, Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

import { RateLimit, RateLimitGuard } from "../../common/rate-limit/rate-limit.module";
import { Roles } from "../auth/decorators/roles.decorator";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { StepUpPurpose } from "../auth/entities/step-up-code.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NonAdminGuard } from "../auth/guards/non-admin.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RequireStepUp, StepUpGuard } from "../auth/guards/step-up.guard";
import { RefundBankInfoDto, ReviewRefundDto } from "../finance/dto/finance.dto";
import { User, UserRole } from "../users/entities/user.entity";
import { WithdrawalStatus } from "./entities/wallet.entity";
import { MIN_WITHDRAW, WithdrawalsService } from "./withdrawals.service";

/** Số tiền + tài khoản nhận (kiểm tra giống tài khoản nhận hoàn tiền). */
export class CreateWithdrawalDto extends RefundBankInfoDto {
  @Type(() => Number)
  @IsInt()
  @Min(MIN_WITHDRAW)
  @Max(1_000_000_000)
  amount!: number;
}

export class RejectWithdrawalDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(5, { message: "Lý do cần ít nhất 5 ký tự." })
  @MaxLength(500)
  adminNotes!: string;
}

export class WithdrawalQueryDto {
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/** Người dùng: gửi/hủy yêu cầu rút tiền ví về tài khoản ngân hàng. */
@Controller("wallet/withdrawals")
@UseGuards(JwtAuthGuard)
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Get()
  mine(@GetCurrentUser() user: User) {
    return this.withdrawalsService.listMine(user);
  }

  /** Cần mã OTP gửi email (tiền rời khỏi hệ thống). */
  @Post()
  @UseGuards(NonAdminGuard, RateLimitGuard, StepUpGuard)
  @RequireStepUp(StepUpPurpose.WALLET_WITHDRAW)
  @RateLimit({ limit: 5, windowMs: 60 * 60_000, keyPrefix: "wallet-withdraw" })
  create(@Body() dto: CreateWithdrawalDto, @GetCurrentUser() user: User) {
    return this.withdrawalsService.request(user, dto);
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  cancel(@Param("id", ParseUUIDPipe) id: string, @GetCurrentUser() user: User) {
    return this.withdrawalsService.cancel(id, user);
  }
}

/** Admin: hàng chờ rút tiền; chuyển khoản tay rồi duyệt kèm mã giao dịch, hoặc từ chối. */
@Controller("admin/wallet-withdrawals")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminWithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Get()
  list(@Query() query: WithdrawalQueryDto) {
    return this.withdrawalsService.adminList(query.status, query.offset, query.limit);
  }

  @Patch(":id/approve")
  @UseGuards(StepUpGuard)
  @RequireStepUp(StepUpPurpose.ADMIN_WITHDRAW)
  approve(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ReviewRefundDto, @GetCurrentUser() admin: User) {
    return this.withdrawalsService.approve(id, dto, admin);
  }

  @Patch(":id/reject")
  reject(@Param("id", ParseUUIDPipe) id: string, @Body() dto: RejectWithdrawalDto, @GetCurrentUser() admin: User) {
    return this.withdrawalsService.reject(id, dto.adminNotes, admin);
  }
}
