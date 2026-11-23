import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import { BehaviorEventType } from "../entities/behavior-event.entity";

export class RecommendAiDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  preferences?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID("4", { each: true })
  excludeIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class PredictAiDto {
  @IsUUID("4")
  campaignId!: string;
}

/** Chiến dịch đang soạn (chưa cần lưu) để AI gợi ý thời hạn cho số tiền người tạo tự đặt. */
export class EstimateCampaignDto {
  @IsString()
  @MaxLength(100)
  category!: string;

  /** Số tiền do người tạo tự quyết (bắt buộc) — AI không gợi ý số tiền. */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(100_000_000_000)
  goalAmount!: number;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class FraudAiDto {
  @IsOptional()
  @IsUUID("4")
  campaignId?: string;

  @IsOptional()
  @IsUUID("4")
  userId?: string;
}

export class CreateBehaviorEventDto {
  @IsUUID("4")
  campaignId!: string;

  @IsEnum(BehaviorEventType)
  eventType!: BehaviorEventType;
}
