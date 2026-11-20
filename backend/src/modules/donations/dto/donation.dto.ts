import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

/** Người nhận quà: bắt buộc khi chọn mức quà để chủ dự án gửi được quà (TC_DON_007). */
export class RewardRecipientDto {
  @IsString()
  @MinLength(2, { message: "Vui lòng nhập họ tên người nhận quà." })
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^\+?[0-9 .-]{8,20}$/, { message: "Số điện thoại người nhận quà không hợp lệ." })
  phone!: string;

  @IsString()
  @MinLength(10, { message: "Vui lòng nhập địa chỉ nhận quà đầy đủ (số nhà, đường, phường/xã, tỉnh/thành)." })
  @MaxLength(300)
  address!: string;
}

export class CreateDonationDto {
  @IsUUID()
  campaignId!: string;

  @IsNumber()
  @Min(20_000)
  amount!: number;

  /** `sepay`: trả ngay; `stripe`/`wallet`: cam kết, chỉ trừ tiền khi chiến dịch đạt mục tiêu. */
  @IsIn(["wallet", "sepay", "stripe"])
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

  /** Bắt buộc khi có `rewardTierId`; chỉ chủ dự án và admin xem được. */
  @IsOptional()
  @ValidateNested()
  @Type(() => RewardRecipientDto)
  rewardRecipient?: RewardRecipientDto;
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
