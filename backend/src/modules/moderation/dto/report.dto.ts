import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

import { ReportReason, ReportStatus } from "../entities/report.entity";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateReportDto {
  @IsUUID()
  campaignId!: string;

  @IsEnum(ReportReason)
  reason!: ReportReason;

  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;
}

export class ReportQueryDto {
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsEnum(ReportReason)
  reason?: ReportReason;

  @IsOptional()
  @IsUUID()
  campaignId?: string;

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

/** Trạng thái admin được phép đặt; `pending` chỉ là trạng thái khởi tạo. */
export const REVIEW_STATUSES = [
  ReportStatus.REVIEWING,
  ReportStatus.RESOLVED,
  ReportStatus.DISMISSED,
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export class ReviewReportDto {
  @IsIn(REVIEW_STATUSES)
  status!: ReviewStatus;

  /** Bắt buộc khi kết luận (resolved/dismissed) — kiểm tra ở service. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;

  /** Chỉ hợp lệ khi `status = resolved` và chiến dịch đang `active`. */
  @IsOptional()
  @IsBoolean()
  pauseCampaign?: boolean;
}
