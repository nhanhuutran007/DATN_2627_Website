import { Transform, Type } from "class-transformer";
import {
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
} from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

/** Mức ủng hộ tối thiểu của hệ thống (khớp CreateDonationDto). */
export const MIN_REWARD_AMOUNT = 20_000;

export class CreateRewardTierDto {
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

export class UpdateRewardTierDto {
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
};

export type RewardClaimView = {
  donationId: string;
  tierId: string;
  tierTitle: string;
  amount: number;
  /** "Ẩn danh" nếu người ủng hộ chọn ẩn danh. */
  backerName: string;
  completedAt: Date | null;
};
