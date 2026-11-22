import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

/** Ảnh lĩnh vực chỉ nhận ảnh tải lên qua `/media/images?purpose=category_image`; chuỗi rỗng = bỏ ảnh. */
export const CATEGORY_IMAGE_URL_PATTERN = /^(\/api\/v1\/media\/categories\/[0-9a-f-]{36}\.(jpg|png|webp))?$/;

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class CreateCategoryDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  @Matches(CATEGORY_IMAGE_URL_PATTERN, { message: "Ảnh lĩnh vực không hợp lệ, vui lòng tải ảnh lên lại." })
  imageUrl?: string;
}

/** Thứ tự mới: toàn bộ id lĩnh vực theo thứ tự hiển thị. */
export class ReorderCategoriesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @IsUUID("all", { each: true })
  ids!: string[];
}
