import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import { CampaignStatus } from "../../campaigns/entities/campaign.entity";
import { DonationStatus } from "../../donations/entities/donation.entity";
import { UserRole, UserStatus } from "../../users/entities/user.entity";
import {
  RiskAlertLevel,
  RiskAlertStatus,
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
  @IsIn(["newest", "ending", "raised", "backers"])
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
}

export class RiskQueryDto {
  @IsOptional()
  @IsEnum(RiskAlertStatus)
  status?: RiskAlertStatus;

  @IsOptional()
  @IsEnum(RiskAlertLevel)
  level?: RiskAlertLevel;

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
