import { Transform, Type, type TransformFnParams } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

import { PROVINCES } from "../../../common/constants/provinces";
import { IsImageUrl } from "../../../common/validators/is-image-url";
import { OrganizationStatus, OrganizationType } from "../entities/organization.entity";

const trim = ({ value }: TransformFnParams): unknown => (typeof value === "string" ? value.trim() : value);
const PHONE = /^\+?[0-9 .-]{8,20}$/;

/** Thông tin giới thiệu: người đại diện sửa được cả khi tổ chức đã xác minh. */
class OrganizationProfileFields {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(50, { message: "Sứ mệnh cần ít nhất 50 ký tự để người ủng hộ hiểu tổ chức." })
  @MaxLength(3000)
  mission?: string;

  @IsOptional()
  @Transform(trim)
  @ValidateIf((_, value) => value !== "")
  @IsUrl({ protocols: ["http", "https"], require_protocol: true }, { message: "Website phải bắt đầu bằng http:// hoặc https://" })
  @MaxLength(300)
  website?: string;

  @IsOptional()
  @Transform(trim)
  @IsEmail({}, { message: "Email liên hệ không hợp lệ." })
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @Transform(trim)
  @Matches(PHONE, { message: "Số điện thoại không hợp lệ." })
  phone?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsIn(PROVINCES, { message: "Tỉnh/thành phải là một trong 34 tỉnh/thành phố" })
  province?: string;

  @IsOptional()
  @IsImageUrl()
  logoUrl?: string;
}

/** Hồ sơ đăng ký tổ chức (người đại diện gửi để admin xác minh). */
export class CreateOrganizationDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name!: string;

  @IsEnum(OrganizationType)
  type!: OrganizationType;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  registrationNumber!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  issuedBy!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  category?: string;

  @Transform(trim)
  @IsString()
  @MinLength(50, { message: "Sứ mệnh cần ít nhất 50 ký tự để người ủng hộ hiểu tổ chức." })
  @MaxLength(3000)
  mission!: string;

  @IsOptional()
  @Transform(trim)
  @ValidateIf((_, value) => value !== "")
  @IsUrl({ protocols: ["http", "https"], require_protocol: true }, { message: "Website phải bắt đầu bằng http:// hoặc https://" })
  @MaxLength(300)
  website?: string;

  @Transform(trim)
  @IsEmail({}, { message: "Email liên hệ không hợp lệ." })
  @MaxLength(200)
  email!: string;

  @Transform(trim)
  @Matches(PHONE, { message: "Số điện thoại không hợp lệ." })
  phone!: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  address!: string;

  @IsIn(PROVINCES, { message: "Tỉnh/thành phải là một trong 34 tỉnh/thành phố" })
  province!: string;

  @IsOptional()
  @IsImageUrl()
  logoUrl?: string;

  @IsImageUrl({ message: "Vui lòng tải lên ảnh giấy phép/quyết định thành lập." })
  documentUrl!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  representativeTitle!: string;
}

/**
 * Người đại diện cập nhật hồ sơ. Thông tin pháp lý (tên, loại, số giấy phép, nơi cấp, ảnh giấy phép,
 * chức vụ) chỉ sửa được khi hồ sơ chưa được xác minh; sửa lúc `needs_info`/`rejected` là gửi lại để duyệt.
 */
export class UpdateOrganizationDto extends OrganizationProfileFields {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  registrationNumber?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  issuedBy?: string;

  @IsOptional()
  @IsImageUrl()
  documentUrl?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  representativeTitle?: string;
}

export const REVIEW_DECISIONS = [
  OrganizationStatus.VERIFIED,
  OrganizationStatus.NEEDS_INFO,
  OrganizationStatus.REJECTED,
  OrganizationStatus.SUSPENDED,
] as const;

export class ReviewOrganizationDto {
  @IsIn(REVIEW_DECISIONS)
  status!: (typeof REVIEW_DECISIONS)[number];

  /** Bắt buộc (≥ 10 ký tự) khi không phải xác minh: người đại diện cần biết phải sửa gì. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class OrganizationQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class AdminOrganizationQueryDto extends OrganizationQueryDto {
  @IsOptional()
  @IsIn([...Object.values(OrganizationStatus), "open"])
  status?: OrganizationStatus | "open";
}
