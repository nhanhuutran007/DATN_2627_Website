import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from "class-validator";

import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { StepUpPurpose } from "../auth/entities/step-up-code.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RequireStepUp, StepUpGuard } from "../auth/guards/step-up.guard";
import { User, UserRole } from "../users/entities/user.entity";
import { DisbursementsService, type DisbursementState } from "./disbursements.service";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class DisbursementQueryDto {
  @IsOptional()
  @IsIn(["collecting", "ready", "disbursed"])
  state?: DisbursementState;
}

export class DisburseDto {
  @Transform(trim)
  @IsString()
  @MinLength(4, { message: "Mã giao dịch chuyển khoản cần ít nhất 4 ký tự." })
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9._\/ -]+$/, { message: "Mã giao dịch chỉ gồm chữ, số và . _ / -" })
  transferReference!: string;

  /** Ảnh chứng từ: `id` từ `POST /media/images` với `purpose=refund_proof` (không bắt buộc). */
  @IsOptional()
  @IsUUID()
  proofMediaId?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  adminNotes?: string;
}

/** Admin: chiến dịch thành công chờ giải ngân; chuyển khoản tay rồi ghi nhận kèm mã giao dịch. */
@Controller("admin/disbursements")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDisbursementsController {
  constructor(private readonly disbursementsService: DisbursementsService) {}

  @Get()
  list(@Query() query: DisbursementQueryDto) {
    return this.disbursementsService.list(query.state);
  }

  /** Cần mã OTP (tiền rời tài khoản Góp Mầm). */
  @Post(":campaignId")
  @UseGuards(StepUpGuard)
  @RequireStepUp(StepUpPurpose.ADMIN_DISBURSE)
  disburse(
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    @Body() dto: DisburseDto,
    @GetCurrentUser() admin: User,
  ) {
    return this.disbursementsService.disburse(campaignId, dto, admin);
  }
}
