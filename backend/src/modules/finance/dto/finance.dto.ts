import { Transform, Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";

import { RefundRequestStatus } from "../entities/refund-request.entity";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class CreateRefundRequestDto {
  @Transform(trim)
  @IsString()
  @MinLength(10, { message: "Lý do cần ít nhất 10 ký tự." })
  @MaxLength(1000)
  reason!: string;
}

export class ReviewRefundDto {
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: "Ghi chú cần ít nhất 5 ký tự." })
  @MaxLength(500)
  adminNotes!: string;
}

export class DirectRefundDto {
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: "Lý do cần ít nhất 5 ký tự." })
  @MaxLength(500)
  reason!: string;
}

export class RefundQueryDto {
  @IsOptional()
  @IsEnum(RefundRequestStatus)
  status?: RefundRequestStatus;

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
  limit?: number = 30;
}

export class ReconciliationQueryDto {
  /** Ngày bắt đầu (bao gồm), ISO date. Mặc định 30 ngày trước. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Ngày kết thúc (bao gồm cả ngày), ISO date. Mặc định hôm nay. */
  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  campaignId?: string;
}

export type CampaignReconciliation = {
  campaignId: string;
  title: string;
  completedCount: number;
  completedAmount: number;
  refundedCount: number;
  refundedAmount: number;
  netAmount: number;
  /** Số liệu đang lưu trên chiến dịch (toàn thời gian). */
  recordedAmount: number;
  recordedBackers: number;
  /** Tổng ròng toàn thời gian theo sổ giao dịch (completed). */
  ledgerAmount: number;
  ledgerBackers: number;
  /** Số liệu chiến dịch lệch so với sổ giao dịch → cần kiểm tra. */
  mismatch: boolean;
};

export type ReconciliationReport = {
  from: string;
  to: string;
  totals: { completedCount: number; completedAmount: number; refundedCount: number; refundedAmount: number; netAmount: number };
  campaigns: CampaignReconciliation[];
  mismatches: number;
};
