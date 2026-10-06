import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

import { IsImageUrl } from "../../../common/validators/is-image-url";

export class CreateMilestoneDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}

/** Độ dài tối thiểu lý do khi sửa mốc của chiến dịch đã phát hành. */
export const CHANGE_REASON_MIN = 10;

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;

  /** Bắt buộc khi chiến dịch đã phát hành; được công khai trong lịch sử thay đổi. */
  @IsOptional()
  @IsString()
  @MinLength(CHANGE_REASON_MIN, { message: `Lý do thay đổi cần ít nhất ${CHANGE_REASON_MIN} ký tự.` })
  @MaxLength(500)
  changeReason?: string;
}

export class MilestoneQueryDto {
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
  limit?: number = 100;
}

/** Tối đa số chứng từ cho một bài cập nhật. */
export const MAX_RECEIPTS_PER_UPDATE = 6;

export class ReceiptAttachmentDto {
  /** `id` trả về từ `POST /media/images` với `purpose=expense_receipt`. */
  @IsUUID("4", { message: "Chứng từ không hợp lệ." })
  mediaId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;
}

export class CampaignUpdatesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class CreateMilestoneUpdateDto {
  @IsString()
  @MinLength(10, { message: "Nội dung cập nhật cần ít nhất 10 ký tự." })
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsImageUrl()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000_000)
  expenseAmount?: number;

  /** Bắt buộc khi `expenseAmount > 0`. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_RECEIPTS_PER_UPDATE)
  @ValidateNested({ each: true })
  @Type(() => ReceiptAttachmentDto)
  receipts?: ReceiptAttachmentDto[];
}
