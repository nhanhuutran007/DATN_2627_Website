import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import { CampaignStatus } from "../entities/campaign.entity";

export class CreateCampaignDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  @MaxLength(100)
  category!: string;

  @IsNumber()
  @Min(1000)
  goalAmount!: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  goalAmount?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;
}

export class CampaignQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsIn(["popular", "ending", "newest", "progress", "latest"])
  sort?: string = "popular";

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
  limit?: number = 9;
}

export class ModerateCampaignDto {
  @IsIn([
    CampaignStatus.APPROVED,
    CampaignStatus.ACTIVE,
    CampaignStatus.PAUSED,
    CampaignStatus.REJECTED,
    CampaignStatus.NEEDS_INFO,
    CampaignStatus.ENDED,
  ])
  status!: CampaignStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}