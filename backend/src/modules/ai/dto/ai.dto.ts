import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
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