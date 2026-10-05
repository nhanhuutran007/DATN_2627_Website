import { Transform, type TransformFnParams } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

import { IsImageUrl } from "../../../common/validators/is-image-url";
import { UserRole } from "../entities/user.entity";

const trim = ({ value }: TransformFnParams): unknown => (typeof value === "string" ? value.trim() : value);

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  email!: string;

  @IsString()
  passwordHash!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

// Độ dài tối đa khớp cột trong bảng `users` để lỗi trả 400 thay vì lỗi SQL.
export class UpdateUserDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: "Họ tên cần ít nhất 2 ký tự." })
  @MaxLength(100, { message: "Họ tên tối đa 100 ký tự." })
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500, { message: "Giới thiệu tối đa 500 ký tự." })
  bio?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^$|^\+?[0-9 .-]{8,20}$/, { message: "Số điện thoại không hợp lệ." })
  phone?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255, { message: "Tên tổ chức tối đa 255 ký tự." })
  organization?: string;

  /** Rỗng = gỡ ảnh đại diện. */
  @IsOptional()
  @ValidateIf((_, value) => value !== "")
  @IsImageUrl()
  @MaxLength(255, { message: "Đường dẫn ảnh quá dài." })
  avatar?: string;
}

export class UpdateRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}

export class UpdateAiConsentDto {
  @IsBoolean()
  consent!: boolean;
}
