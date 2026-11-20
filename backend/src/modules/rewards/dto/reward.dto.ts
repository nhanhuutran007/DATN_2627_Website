import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

import { IsImageUrl } from "../../../common/validators/is-image-url";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

/** Mức ủng hộ tối thiểu của hệ thống (khớp CreateDonationDto). */
export const MIN_REWARD_AMOUNT = 20_000;
export const MAX_REWARD_ITEMS = 10;

/** Một món "Bao gồm" của phần quà. */
export class RewardItemDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: "Tên món quà cần ít nhất 2 ký tự." })
  @MaxLength(120)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;
}

/** Trường chi tiết kiểu Kickstarter, dùng chung cho tạo và sửa (bỏ trống = giữ nguyên khi sửa). */
class RewardDetailsDto {
  /** `null` để gỡ ảnh. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsImageUrl()
  @MaxLength(500)
  imageUrl?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_REWARD_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => RewardItemDto)
  items?: RewardItemDto[];

  @IsOptional()
  @IsBoolean()
  requiresShipping?: boolean;

  /** Hạn chọn quà; `null` = đến hết chiến dịch. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  availableUntil?: string | null;
}

export class CreateRewardTierDto extends RewardDetailsDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(MIN_REWARD_AMOUNT)
  @Max(1_000_000_000)
  minAmount!: number;

  /** Bỏ trống = không giới hạn số suất. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  quantityLimit?: number | null;

  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class UpdateRewardTierDto extends RewardDetailsDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(MIN_REWARD_AMOUNT)
  @Max(1_000_000_000)
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  quantityLimit?: number | null;

  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export type RewardTierView = {
  id: string;
  campaignId: string;
  title: string;
  description: string;
  minAmount: number;
  quantityLimit: number | null;
  claimedCount: number;
  /** Số suất còn lại; `null` nếu không giới hạn. */
  remaining: number | null;
  estimatedDelivery: string | null;
  sortOrder: number;
  isActive: boolean;
  imageUrl: string | null;
  items: { name: string; quantity: number }[];
  requiresShipping: boolean;
  availableUntil: Date | null;
  /** Còn chọn được: đang mở, còn suất và chưa quá hạn chọn. */
  available: boolean;
};

export type RewardClaimView = {
  donationId: string;
  tierId: string;
  tierTitle: string;
  amount: number;
  /** "Ẩn danh" nếu người ủng hộ chọn ẩn danh. */
  backerName: string;
  /** `completed`: đã thu tiền; `pledged`/`charge_failed`: cam kết, chờ trừ tiền (như backer report của Kickstarter). */
  status: string;
  completedAt: Date | null;
  /** Thông tin gửi quà do người ủng hộ khai lúc chọn quà; `null` với khoản cũ chưa có thông tin này. */
  recipient: { name: string; phone: string; address: string } | null;
};
