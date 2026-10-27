import { Transform, Type, type TransformFnParams } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";

import { PROVINCES } from "../../../common/constants/provinces";

import { IsImageUrl } from "../../../common/validators/is-image-url";
import { CampaignStatus } from "../entities/campaign.entity";

export class CreateCampaignDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  // Nội dung HTML từ trình soạn thảo (ảnh lưu dạng link, không nhúng base64).
  @MaxLength(200000)
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
  @IsImageUrl()
  imageUrl?: string;

  @IsOptional()
  @IsIn(PROVINCES, { message: "Địa điểm phải là một trong 34 tỉnh/thành phố" })
  location?: string;

  /** Gây quỹ cho một tổ chức đã xác minh (bỏ trống = gây quỹ cá nhân). */
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200000)
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
  @IsImageUrl()
  imageUrl?: string;

  @IsOptional()
  @IsIn(PROVINCES, { message: "Địa điểm phải là một trong 34 tỉnh/thành phố" })
  location?: string;

  /** `null` = chuyển về gây quỹ cá nhân. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  organizationId?: string | null;
}

/** `?status=active,success` hoặc `?status=active&status=success` → mảng trạng thái. */
function toStatusList({ value }: TransformFnParams): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  const parts = (Array.isArray(value) ? value : [value]).flatMap((item: unknown) =>
    typeof item === "string" ? item.split(",") : [item],
  );
  return parts.map((item) => (typeof item === "string" ? item.trim() : item)).filter((item) => item !== "");
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

  /** Chỉ chiến dịch gây quỹ cho tổ chức này. */
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  /** Chỉ chiến dịch gây quỹ cho một tổ chức đang ở trạng thái đã xác minh. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true" || value === "1")
  @IsBoolean()
  forOrganization?: boolean;

  /** Một hoặc nhiều trạng thái (cách nhau bởi dấu phẩy). */
  @IsOptional()
  @Transform(toStatusList)
  @IsArray()
  @ArrayMaxSize(11)
  @IsEnum(CampaignStatus, { each: true })
  status?: CampaignStatus[];

  /** Địa điểm chứa chuỗi này (không phân biệt hoa thường). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  /** Khoảng mục tiêu vốn (VNĐ). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minGoal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxGoal?: number;

  /** Khoảng tỷ lệ hoàn thành (%), tính từ số tiền đã xác nhận / mục tiêu. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  minProgress?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  maxProgress?: number;

  /** Chỉ chiến dịch đang gây quỹ và kết thúc trong N ngày tới. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  endingWithinDays?: number;

  @IsOptional()
  @IsIn(["featured", "popular", "ending", "newest", "progress", "latest"])
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
export class CampaignStatsQueryDto {
  /** Số ngày gần nhất cho chuỗi theo ngày. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(90)
  days?: number = 30;
}
