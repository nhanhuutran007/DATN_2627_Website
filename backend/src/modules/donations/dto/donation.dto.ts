import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class CreateDonationDto {
  @IsUUID()
  campaignId!: string;

  @IsNumber()
  @Min(20_000)
  amount!: number;

  @IsIn(["wallet", "payos"])
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @IsString()
  @MaxLength(255)
  idempotencyKey!: string;

  /** Chọn mức quà (số tiền phải ≥ mức tối thiểu, mức còn suất). */
  @IsOptional()
  @IsUUID()
  rewardTierId?: string;
}

export class ConfirmDonationDto {
  @IsIn(["completed", "failed"])
  status!: "completed" | "failed";
}

/** Kết quả cổng thanh toán có thể báo về qua webhook. */
export const WEBHOOK_STATUSES = ["completed", "failed", "cancelled", "expired"] as const;
export type WebhookStatus = (typeof WEBHOOK_STATUSES)[number];

export class WebhookDonationDto {
  @IsUUID()
  donationId!: string;

  @IsIn(WEBHOOK_STATUSES)
  status!: WebhookStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  transactionId?: string;

  /** Epoch ms lúc cổng thanh toán tạo webhook; dùng để chống replay. */
  @IsInt()
  @IsPositive()
  timestamp!: number;
}
