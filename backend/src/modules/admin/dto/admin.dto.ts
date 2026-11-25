import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

import { CampaignStatus } from "../../campaigns/entities/campaign.entity";
import { DonationStatus } from "../../donations/entities/donation.entity";
import { UserRole, UserStatus } from "../../users/entities/user.entity";
import {
  RiskAlertLevel,
  RiskAlertStatus,
  RiskEntityType,
  RiskMethod,
} from "../entities/risk-alert.entity";

export class AdminCampaignQueryDto {
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minGoal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxGoal?: number;

  @IsOptional()
  @IsIn(["newest", "ending", "raised", "backers", "submitted"])
  sort?: string = "newest";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AdminDonationQueryDto {
  @IsOptional()
  @IsEnum(DonationStatus)
  status?: DonationStatus;

  /** Chỉ giao dịch của chiến dịch hoặc người ủng hộ đang có cảnh báo rủi ro `open`. */
  @IsOptional()
  @Transform(({ value }) => (value === "true" || value === true ? true : value === "false" || value === false ? false : value))
  @IsBoolean()
  flagged?: boolean;

  /** Tìm theo tên chiến dịch, tên/email người ủng hộ, mã giao dịch. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AdminUserQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;

  /** Lý do khóa/mở khóa, lưu vào nhật ký kiểm toán. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** Hủy cam kết của các tài khoản nghi là clone ở một chiến dịch (tùy chọn khóa luôn tài khoản). */
export class VoidSuspectPledgesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsUUID("all", { each: true })
  userIds!: string[];

  @IsOptional()
  @IsBoolean()
  lockAccounts?: boolean;

  @IsString()
  @MinLength(5, { message: "Cần ghi lý do (ít nhất 5 ký tự)." })
  @MaxLength(500)
  reason!: string;
}

/** Mở lại quyền cam kết trả sau; lý do lưu vào nhật ký kiểm toán. */
export class PledgeResetDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RiskQueryDto {
  @IsOptional()
  @IsEnum(RiskAlertStatus)
  status?: RiskAlertStatus;

  @IsOptional()
  @IsEnum(RiskAlertLevel)
  level?: RiskAlertLevel;

  @IsOptional()
  @IsEnum(RiskEntityType)
  entityType?: RiskEntityType;

  @IsOptional()
  @IsEnum(RiskMethod)
  method?: RiskMethod;

  /** Tìm theo tên đối tượng hoặc mã (ID) của đối tượng bị cảnh báo. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class UpdateRiskStatusDto {
  @IsEnum(RiskAlertStatus)
  status!: RiskAlertStatus;

  /** Lý do xác nhận/bỏ qua (bắt buộc khi đóng cảnh báo), lưu vào nhật ký kiểm toán. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class SetFeaturedDto {
  @IsBoolean()
  featured!: boolean;
}

export class ExportRangeQueryDto {
  /** Ngày bắt đầu (bao gồm), ISO date. Mặc định 30 ngày trước. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Ngày kết thúc (bao gồm cả ngày), ISO date. Mặc định hôm nay. */
  @IsOptional()
  @IsDateString()
  to?: string;
}
