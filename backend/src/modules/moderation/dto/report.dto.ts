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

  /** Báo cáo một bình luận cụ thể của chiến dịch (bỏ trống = báo cáo chiến dịch). */
  @IsOptional()
  @IsUUID()
  commentId?: string;

  @IsEnum(ReportReason)
  reason!: ReportReason;

  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;
}

/** `open` = còn cần xử lý (chờ xem xét + đang xem xét). */
export const REPORT_STATUS_FILTERS = [...Object.values(ReportStatus), "open"] as const;

export class ReportQueryDto {
  @IsOptional()
  @IsIn(REPORT_STATUS_FILTERS)
  status?: ReportStatus | "open";

  @IsOptional()
  @IsEnum(ReportReason)
  reason?: ReportReason;

  @IsOptional()
  @IsUUID()
  campaignId?: string;

  /** Báo cáo nhắm vào chiến dịch hay vào một bình luận. */
  @IsOptional()
  @IsIn(["campaign", "comment"])
  target?: "campaign" | "comment";

  /** Tìm trong nội dung báo cáo, tên chiến dịch, tên/email người báo cáo. */
  @IsOptional()
  @Transform(trim)
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

  /** Chỉ hợp lệ khi `status = resolved` và báo cáo nhắm vào một bình luận. */
  @IsOptional()
  @IsBoolean()
  hideComment?: boolean;
}
