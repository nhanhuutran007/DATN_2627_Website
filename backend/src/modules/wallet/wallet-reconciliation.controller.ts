import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { StepUpPurpose } from "../auth/entities/step-up-code.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RequireStepUp, StepUpGuard } from "../auth/guards/step-up.guard";
import { User, UserRole } from "../users/entities/user.entity";
import { WalletReconciliationService } from "./wallet-reconciliation.service";

export class WalletReconQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  /** Chỉ ví lệch sổ. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === "true" || value === "1")
  @IsBoolean()
  issuesOnly?: boolean;

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

export class RestoreWalletDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(10, { message: "Ghi rõ lý do (ít nhất 10 ký tự)." })
  @MaxLength(500)
  reason!: string;
}

/** Admin: số dư ví của người dùng, đối chiếu với sổ giao dịch và chứng từ gốc. */
@Controller("admin/wallets")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminWalletReconciliationController {
  constructor(private readonly reconciliation: WalletReconciliationService) {}

  @Get()
  list(@Query() query: WalletReconQueryDto) {
    return this.reconciliation.list(query);
  }

  @Get(":userId")
  detail(@Param("userId", ParseUUIDPipe) userId: string) {
    return this.reconciliation.detail(userId);
  }

  /** Đưa ví về đúng sổ giao dịch; cần mã OTP như khi chi tiền rút. */
  @Post(":userId/restore")
  @HttpCode(HttpStatus.OK)
  @UseGuards(StepUpGuard)
  @RequireStepUp(StepUpPurpose.ADMIN_WITHDRAW)
  restore(@Param("userId", ParseUUIDPipe) userId: string, @Body() dto: RestoreWalletDto, @GetCurrentUser() admin: User) {
    return this.reconciliation.restore(userId, dto.reason, admin);
  }
}
